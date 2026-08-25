import http from 'node:http';
import https from 'node:https';
import { PassThrough } from 'node:stream';
import { URL } from 'node:url';
import Agent, { HttpsAgent } from 'agentkeepalive';
import deepmerge from 'deepmerge';
import type { ClientRequest, IncomingMessage, OutgoingHttpHeaders } from 'node:http';

import { appIdToNameAndSlot } from '../../common/utils';
import { SdkOptions } from '../../common/SdkOptions';
import { objectToBase64 } from '../objectToBase64';
import { findLargestHeader, headFor, measureHeadTotal, truncateForLog } from './header-block';
import type { OutgoingRequest } from './header-block';
import type { ServerRouter, WrapperConf } from './server-router';
import type { TransformedRegistryConfig } from '../types/Registry';

import errors from './errors';

type Logger = Pick<Console, 'debug' | 'warn'>;

interface FragmentAttributes {
    id: string;
    url?: string;
    primary?: boolean;
    timeout?: number;
    ignoreInvalidSsl?: boolean;
    spaBundleUrl?: string;
    appProps?: Record<string, unknown>;
    wrapperConf?: WrapperConf | null;
    wrapperPropsOverride?: Record<string, unknown> | null;
    [key: string]: unknown;
}

interface FragmentRequestContext {
    router: ServerRouter;
    /** Required, not optional: this module reads apps[].l10nManifest and cannot build a
     * fragment url without it. Tailor always supplies it. */
    registryConfig: TransformedRegistryConfig;
    host?: string;
    id?: string;
    headers?: http.IncomingHttpHeaders;
}

/** A PassThrough dressed as a fragment response, for a request that was never sent. */
interface SuppressedResponse extends PassThrough {
    statusCode: number;
    headers: OutgoingHttpHeaders;
}

type FilterHeaders = (
    attributes: FragmentAttributes,
    request: FragmentRequestContext,
    extraHeaders?: string[],
) => Record<string, string>;

interface FragmentResponseContext {
    request: FragmentRequestContext;
    fragmentUrl: string;
    fragmentAttributes: FragmentAttributes;
    isWrapper?: boolean;
}

type ProcessFragmentResponse = (
    response: IncomingMessage | SuppressedResponse,
    context: FragmentResponseContext,
) => unknown;

interface SizeGuardContext {
    sizeLimit: number;
    logger: Logger;
    operationId?: string;
    appId: string;
    wrappedAppId?: string;
    hasClientBundle: boolean;
    path?: string;
}

const NS_IN_SEC = 1e6;
const MS_IN_SEC = 1000;

// Must stay below the fragments' own --max-http-header-size, which is node's default
// 16384 unless a fragment raises it. ILC itself runs at 30000 (see package.json), so
// without this ceiling it accepts inbound requests it cannot forward.
const MAX_LOGGED_PATH_LENGTH = 256;

// A suppressed primary fragment with no client bundle has no way to produce its content
const SUPPRESSED_WITHOUT_CONTENT_STATUS = 431;
const SUPPRESSED_STATUS = 200;

// By default tailor supports gzipped response from fragments
const requiredHeaders = {
    'accept-encoding': 'gzip, deflate',
};

const kaAgent = new Agent();
const kaAgentHttps = new HttpsAgent();

/**
 * Simple Request Promise Function that requests the fragment server with
 *  - filtered headers
 *  - Specified timeout from fragment attributes
 *
 * @param {filterHeaders} - Function that handles the header forwarding
 * @param {processFragmentResponse} - Function that handles response processing
 * @param {string} fragmentUrl - URL of the fragment server
 * @param {Object} attributes - Attributes passed via fragment tags
 * @param {Object} request - HTTP request stream
 * @returns {Promise} Response from the fragment server
 */
export function requestFragmentFactory(
    filterHeaders: FilterHeaders,
    processFragmentResponse: ProcessFragmentResponse,
    logger: Logger,
    { maxRequestSize }: { maxRequestSize?: unknown } = {},
) {
    const sizeLimit = resolveSizeLimit(maxRequestSize, logger);

    return function requestFragment(
        fragmentUrl: string,
        attributes: FragmentAttributes,
        request: FragmentRequestContext,
    ): Promise<unknown> {
        return new Promise<unknown>((resolve, reject) => {
            const currRoute = request.router.getRoute();

            if (attributes.wrapperConf) {
                const wrapperConf = attributes.wrapperConf;

                if (!wrapperConf.src) {
                    // A wrapper declaring `ssr: {}` reaches here with no src. Without this the
                    // URL constructor below throws an opaque TypeError; naming the cause costs
                    // one branch and does not change which requests succeed.
                    reject(
                        new errors.FragmentRequestError({
                            message: `No SSR url specified for app wrapper "${wrapperConf.appId}"`,
                        }),
                    );

                    return;
                }

                const reqUrl = makeFragmentUrl({
                    route: currRoute,
                    baseUrl: wrapperConf.src,
                    appId: wrapperConf.appId,
                    props: wrapperConf.props,
                    ignoreBasePath: true,
                    wrappedAppProps: attributes.appProps,
                });

                logger.debug(
                    {
                        url: currRoute.route,
                        id: request.id,
                        domain: request.host,
                        detailsJSON: JSON.stringify({
                            attributes,
                        }),
                    },
                    'Request Fragment. Init processing for wrapper',
                );

                const wrapperHeaders = {
                    ...filterHeaders(attributes, request, request.registryConfig?.settings?.fragmentProxyHeaders),
                    ...requiredHeaders,
                };

                const fragmentRequest = makeRequest(
                    reqUrl,
                    wrapperHeaders,
                    wrapperConf.timeout,
                    attributes.ignoreInvalidSsl || wrapperConf.ignoreInvalidSsl,
                );

                const wrapperHasClientBundle = Boolean(wrapperConf.spaBundleUrl) && Boolean(attributes.spaBundleUrl);

                if (
                    isOverSizeLimit(fragmentRequest, {
                        sizeLimit,
                        logger,
                        operationId: request.id,
                        // The url was built for the wrapper; attributes.id names the wrapped app.
                        appId: wrapperConf.appId,
                        wrappedAppId: attributes.id,
                        hasClientBundle: wrapperHasClientBundle,
                        path: currRoute.reqUrl,
                    })
                ) {
                    cancelRequest(fragmentRequest);
                    resolve(
                        processFragmentResponse(
                            emptyFragmentResponse(suppressedStatusFor(attributes, wrapperHasClientBundle)),
                            {
                                request,
                                fragmentUrl: reqUrl,
                                fragmentAttributes: attributes,
                                isWrapper: true,
                            },
                        ),
                    );

                    return;
                }

                fragmentRequest.on('response', (response) => {
                    try {
                        logger.debug(
                            {
                                url: currRoute.route,
                                id: request.id,
                                domain: request.host,
                                detailsJSON: JSON.stringify({
                                    statusCode: response.statusCode,
                                    'x-props-override': response.headers['x-props-override'],
                                }),
                            },
                            'Request Fragment. Wrapper Fragment Response',
                        );

                        // Wrapper says that we need to request wrapped application
                        if (response.statusCode === 210) {
                            logger.debug(
                                { url: currRoute.route, operationId: request.id },
                                'Request Fragment. Wrapper Fragment Response. ForwardRequest',
                            );
                            const propsOverride = response.headers['x-props-override'];
                            attributes.wrapperPropsOverride = {};
                            if (typeof propsOverride === 'string') {
                                const props = JSON.parse(Buffer.from(propsOverride, 'base64').toString('utf8'));
                                attributes.appProps = deepmerge(attributes.appProps ?? {}, props);
                                attributes.wrapperPropsOverride = props;
                            }
                            attributes.wrapperConf = null;

                            logger.debug(
                                {
                                    url: currRoute.route,
                                    id: request.id,
                                    domain: request.host,
                                    detailsJSON: JSON.stringify({
                                        attributes,
                                    }),
                                },
                                'Request Fragment. Wrapper Fragment Processing. Attribute overriding',
                            );

                            resolve(requestFragment(fragmentUrl, attributes, request));

                            return;
                        }

                        logger.debug(
                            { url: currRoute.route, operationId: request.id },
                            'Request Fragment. Wrapper Fragment Response. Using App Wrapper.',
                        );

                        resolve(
                            processFragmentResponse(response, {
                                request,
                                // A special route (404 and friends) has no `route` pattern, so
                                // this is undefined for those and always has been. The cast
                                // preserves the pre-TypeScript behaviour; the downstream
                                // JSDoc declaring it required is a separate defect.
                                fragmentUrl: currRoute.route as string,
                                fragmentAttributes: attributes,
                                isWrapper: true,
                            }),
                        );
                    } catch (e) {
                        logger.debug(
                            {
                                url: currRoute.route,
                                id: request.id,
                                domain: request.host,
                            },
                            'Request Fragment. Wrapper Fragment Processing. Fragment Response Processing Error',
                        );
                        reject(e);
                    }
                });
                fragmentRequest.on('error', (error) => {
                    logger.debug(
                        {
                            url: currRoute.route,
                            id: request.id,
                            domain: request.host,
                        },
                        'Request Fragment. Wrapper Fragment Processing. Fragment Request Error',
                    );
                    reject(
                        new errors.FragmentRequestError({
                            message: `Error during SSR request to fragment wrapper at URL: ${fragmentUrl}`,
                            cause: error,
                        }),
                    );
                });
                fragmentRequest.end();
            } else {
                const { appName } = appIdToNameAndSlot(attributes.id);

                const sdkOptions = new SdkOptions({
                    i18n: {
                        manifestPath: request.registryConfig['apps'][appName].l10nManifest,
                    },
                });

                const reqUrl = makeFragmentUrl({
                    route: currRoute,
                    baseUrl: fragmentUrl,
                    appId: attributes.id,
                    props: attributes.appProps,
                    sdkOptions: sdkOptions.toJSON(),
                });

                logger.debug(
                    {
                        url: currRoute.route,
                        id: request.id,
                        domain: request.host,
                        detailsJSON: JSON.stringify({
                            route: currRoute,
                            baseUrl: fragmentUrl,
                            appId: attributes.id,
                            props: attributes.appProps,
                        }),
                    },
                    'Request Fragment. Fragment Processing.',
                );

                const fragmentHeaders = {
                    ...filterHeaders(attributes, request, request.registryConfig?.settings?.fragmentProxyHeaders),
                    ...requiredHeaders,
                };

                const startTime = process.hrtime();
                const fragmentRequest = makeRequest(
                    reqUrl,
                    fragmentHeaders,
                    attributes.timeout,
                    attributes.ignoreInvalidSsl,
                );

                const hasClientBundle = Boolean(attributes.spaBundleUrl);

                if (
                    isOverSizeLimit(fragmentRequest, {
                        sizeLimit,
                        logger,
                        operationId: request.id,
                        appId: attributes.id,
                        hasClientBundle,
                        path: currRoute.reqUrl,
                    })
                ) {
                    cancelRequest(fragmentRequest);
                    resolve(
                        processFragmentResponse(
                            emptyFragmentResponse(suppressedStatusFor(attributes, hasClientBundle)),
                            {
                                request,
                                fragmentUrl: reqUrl,
                                fragmentAttributes: attributes,
                            },
                        ),
                    );

                    return;
                }

                fragmentRequest.on('response', (response) => {
                    try {
                        resolve(
                            processFragmentResponse(response, {
                                request,
                                fragmentUrl: reqUrl,
                                fragmentAttributes: attributes,
                            }),
                        );
                        logger.debug(
                            { url: currRoute.route, id: request.id, domain: request.host },
                            'Fragment Processing. Finished',
                        );
                    } catch (e) {
                        reject(e);
                    }
                });
                fragmentRequest.on('timeout', () => {
                    const endTime = process.hrtime(startTime);
                    reject(
                        new errors.FragmentRequestError({
                            message: `Error during SSR request to fragment at URL: ${fragmentUrl} due to timeout after ${
                                endTime[0] * MS_IN_SEC + endTime[1] / NS_IN_SEC
                            }ms`,
                        }),
                    );
                });
                fragmentRequest.on('error', (error) => {
                    reject(
                        new errors.FragmentRequestError({
                            message: `Error during SSR request to fragment at URL: ${fragmentUrl}`,
                            cause: error,
                        }),
                    );
                });
                fragmentRequest.end();
            }
        });
    };
}

function isOverSizeLimit(
    fragmentRequest: ClientRequest,
    { sizeLimit, logger, operationId, appId, wrappedAppId, hasClientBundle, path }: SizeGuardContext,
): boolean {
    if (sizeLimit === 0) {
        return false;
    }

    const head = headFor(fragmentRequest);

    if (head === null) {
        logger.warn(
            { operationId, appId, wrappedAppId, path: truncateForLog(path ?? '', MAX_LOGGED_PATH_LENGTH) },
            'Request Fragment. Size guard skipped, request head could not be determined',
        );

        // Behave exactly as if the guard were switched off. It exists to prevent a 431 for a
        // small fraction of requests, so it must never become the reason every fragment fails.
        return false;
    }

    const total = measureHeadTotal(head);

    if (total <= sizeLimit) {
        // The overwhelmingly common path: one byte count, no per-line scan.
        return false;
    }

    logger.warn(
        {
            operationId,
            appId,
            wrappedAppId,
            size: total,
            limit: sizeLimit,
            largestHeader: findLargestHeader(head),
            hasClientBundle,
            path: truncateForLog(path ?? '', MAX_LOGGED_PATH_LENGTH),
        },
        'Request Fragment. Skipped dispatch, computed request size exceeds the limit',
    );

    return true;
}

// A limit of 0 switches the guard off, so it is also what an unconfigured or unusable value
// resolves to: the guard is opt-in and must not inherit a ceiling ILC invented.
function resolveSizeLimit(maxRequestSize: unknown, logger: Logger): number {
    if (maxRequestSize === undefined) {
        return 0;
    }

    const isUsableType =
        typeof maxRequestSize === 'number' || (typeof maxRequestSize === 'string' && maxRequestSize.trim() !== '');
    const parsedLimit = Number(maxRequestSize);

    if (!isUsableType || !Number.isFinite(parsedLimit) || parsedLimit < 0) {
        logger.warn(
            {
                maxRequestSize: truncateForLog(String(maxRequestSize), MAX_LOGGED_PATH_LENGTH),
                limit: 0,
            },
            'Request Fragment. Configured max request size is not usable, size guard stays disabled',
        );

        return 0;
    }

    return parsedLimit;
}

function cancelRequest(fragmentRequest: ClientRequest): void {
    fragmentRequest.on('error', () => {});
    fragmentRequest.destroy();
}

/**
 * The status a suppressed fragment answers with. Only a primary fragment that cannot render
 * client-side changes it: its slot stays blank, and the page must say so.
 */
function suppressedStatusFor(attributes: FragmentAttributes, hasClientBundle: boolean): number {
    return !hasClientBundle && attributes.primary ? SUPPRESSED_WITHOUT_CONTENT_STATUS : SUPPRESSED_STATUS;
}

/**
 * Stands in for a fragment response that was never requested. Resolving with this keeps
 * the failure out of the tailor error handlers — which would report it as an ERROR — and
 * lets the fragment degrade to a client-side render.
 */
function emptyFragmentResponse(statusCode: number): SuppressedResponse {
    const response = new PassThrough() as SuppressedResponse;

    response.statusCode = statusCode;
    response.headers = {};
    response.end();

    return response;
}

interface FragmentUrlParts {
    route: { basePath?: string; reqUrl?: string };
    baseUrl: string;
    appId: string;
    props?: Record<string, unknown>;
    ignoreBasePath?: boolean;
    sdkOptions?: Record<string, unknown>;
    wrappedAppProps?: Record<string, unknown>;
}

function makeFragmentUrl({
    route,
    baseUrl,
    appId,
    props,
    ignoreBasePath = false,
    sdkOptions,
    wrappedAppProps,
}: FragmentUrlParts): string {
    const url = new URL(baseUrl);

    const reqProps = {
        basePath: ignoreBasePath ? '/' : route.basePath,
        reqUrl: route.reqUrl,
        fragmentName: appId,
    };

    url.searchParams.append('routerProps', objectToBase64(reqProps));

    if (props) {
        url.searchParams.append('appProps', objectToBase64(props));
    }

    if (sdkOptions) {
        url.searchParams.append('sdk', objectToBase64(sdkOptions));
    }

    if (wrappedAppProps) {
        url.searchParams.append('wrappedProps', objectToBase64(wrappedAppProps));
    }

    return url.toString();
}

function makeRequest(
    reqUrl: string,
    headers: Record<string, string>,
    timeout?: number,
    ignoreInvalidSsl = false,
): ClientRequest {
    const url = new URL(reqUrl);
    const { hostname, port, pathname, search, username, password, protocol } = url;
    const options: https.RequestOptions = {
        headers,
        timeout,
        auth: username && password ? `${username}:${password}` : undefined,
        host: hostname, // the difference between "host" and "hostname" is that "host" includes port
        port,
        path: pathname + search,
        protocol,
    };

    const hasHttpsProtocol = protocol === 'https:';
    const httpLib = hasHttpsProtocol ? https : http;
    options.agent = hasHttpsProtocol ? kaAgentHttps : kaAgent;

    if (hasHttpsProtocol && ignoreInvalidSsl) {
        options.rejectUnauthorized = false;
    }

    const fragmentRequest = httpLib.request(options);

    if (timeout) {
        fragmentRequest.setTimeout(timeout, fragmentRequest.abort);
    }

    return fragmentRequest;
}
