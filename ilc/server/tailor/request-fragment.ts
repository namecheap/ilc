import http, { type IncomingHttpHeaders, type IncomingMessage } from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import Agent, { HttpsAgent } from 'agentkeepalive';
import deepmerge from 'deepmerge';
import type { Logger } from 'ilc-plugins-sdk';

import { appIdToNameAndSlot, removeQueryParams } from '../../common/utils';
import { SdkOptions } from '../../common/SdkOptions';
import { objectToBase64 } from '../objectToBase64';
import { FragmentRequestError } from './errors';
import type { FragmentAttributes, FragmentWrapperConf } from './fragment-attributes';
import type { FragmentRequest, FragmentRenderOptions, FragmentResponse } from './fragment-render';

const NS_IN_SEC = 1e6;
const MS_IN_SEC = 1000;

const DEFAULT_REQUEST_TIMEOUT_MS = 3000;

// By default tailor supports gzipped response from fragments
const requiredHeaders = {
    'accept-encoding': 'gzip, deflate',
};

const kaAgent = new Agent();
const kaAgentHttps = new HttpsAgent();

type FilterHeadersFn = (
    attributes: FragmentAttributes,
    request: { headers?: IncomingHttpHeaders },
    extraHeaders: string[] | undefined,
    renderOptions: FragmentRenderOptions,
) => Record<string, string>;

type ProcessFragmentResponse = (
    response: IncomingMessage,
    context: {
        request: FragmentRequest;
        fragmentUrl: string;
        fragmentAttributes: FragmentAttributes;
        isWrapper?: boolean;
    },
) => FragmentResponse;

/** Requests the fragment server with filtered headers and the fragment's configured timeout. */
export = (filterHeaders: FilterHeadersFn, processFragmentResponse: ProcessFragmentResponse, logger: Logger) => {
    // A global setting, so the warning below states a fact that never changes for an app, while
    // shared renders recur on every miss and refresh. Report it once per app, not per render.
    const appsWarnedAboutDroppedProxyHeaders = new Set<string>();

    return function requestFragment(
        fragmentUrl: string,
        attributes: FragmentAttributes,
        request: FragmentRequest,
        renderOptions: FragmentRenderOptions = { mode: 'private' },
    ): Promise<FragmentResponse> {
        return new Promise<FragmentResponse>((resolve, reject) => {
            const currRoute = request.router.getRoute();

            const proxyHeaders = request.registryConfig?.settings?.fragmentProxyHeaders;
            const appId = attributes.id ?? 'unknown';
            if (
                renderOptions.mode === 'shared' &&
                proxyHeaders &&
                proxyHeaders.length > 0 &&
                !appsWarnedAboutDroppedProxyHeaders.has(appId)
            ) {
                appsWarnedAboutDroppedProxyHeaders.add(appId);
                logger.warn(
                    { appId: attributes.id, fragmentProxyHeaders: proxyHeaders },
                    '[ILC Cache]: fragmentProxyHeaders are configured but dropped on a shared (cacheable) render',
                );
            }
            const fragmentHeaders = filterHeaders(attributes, request, proxyHeaders, renderOptions);

            if (attributes.wrapperConf) {
                const wrapperConf = attributes.wrapperConf as FragmentWrapperConf;
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

                const fragmentRequest = makeRequest(
                    reqUrl,
                    {
                        ...fragmentHeaders,
                        ...requiredHeaders,
                    },
                    wrapperConf.timeout,
                    attributes.ignoreInvalidSsl || wrapperConf.ignoreInvalidSsl,
                );

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
                            if (propsOverride) {
                                const props = JSON.parse(
                                    Buffer.from(propsOverride as string, 'base64').toString('utf8'),
                                );
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
                        new FragmentRequestError({
                            message: `Error during SSR request to fragment wrapper at URL: ${fragmentUrl}`,
                            cause: error,
                        }),
                    );
                });
                fragmentRequest.end();
            } else {
                const { appName } = appIdToNameAndSlot(attributes.id as string);

                const sdkOptions = new SdkOptions({
                    i18n: {
                        manifestPath: request.registryConfig.apps[appName].l10nManifest,
                    },
                });

                const reqUrl = makeFragmentUrl({
                    route: currRoute,
                    baseUrl: fragmentUrl,
                    appId: attributes.id,
                    props: attributes.appProps,
                    sdkOptions: sdkOptions.toJSON(),
                    stripReqUrlQuery: renderOptions.mode === 'shared',
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

                const startTime = process.hrtime();
                const fragmentRequest = makeRequest(
                    reqUrl,
                    {
                        ...fragmentHeaders,
                        ...requiredHeaders,
                    },
                    attributes.timeout,
                    attributes.ignoreInvalidSsl,
                );

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
                        new FragmentRequestError({
                            message: `Error during SSR request to fragment at URL: ${fragmentUrl} due to timeout after ${
                                endTime[0] * MS_IN_SEC + endTime[1] / NS_IN_SEC
                            }ms`,
                        }),
                    );
                });
                fragmentRequest.on('error', (error) => {
                    reject(
                        new FragmentRequestError({
                            message: `Error during SSR request to fragment at URL: ${fragmentUrl}`,
                            cause: error,
                        }),
                    );
                });
                fragmentRequest.end();
            }
        });
    };
};

interface MakeFragmentUrlOptions {
    route: { basePath?: string; reqUrl?: string };
    baseUrl: string;
    appId?: string;
    props?: object | null;
    ignoreBasePath?: boolean;
    sdkOptions?: unknown;
    wrappedAppProps?: object | null;
    stripReqUrlQuery?: boolean;
}

function makeFragmentUrl({
    route,
    baseUrl,
    appId,
    props,
    ignoreBasePath = false,
    sdkOptions,
    wrappedAppProps,
    stripReqUrlQuery = false,
}: MakeFragmentUrlOptions): string {
    const url = new URL(baseUrl);

    const reqProps = {
        basePath: ignoreBasePath ? '/' : route.basePath,
        reqUrl: stripReqUrlQuery ? removeQueryParams(route.reqUrl as string) : route.reqUrl,
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

function makeRequest(reqUrl: string, headers: Record<string, string>, timeout?: number, ignoreInvalidSsl = false) {
    const url = new URL(reqUrl);
    const { hostname, port, pathname, search, username, password, protocol } = url;
    const effectiveTimeout = typeof timeout === 'number' && timeout > 0 ? timeout : DEFAULT_REQUEST_TIMEOUT_MS;
    const options: http.RequestOptions & { rejectUnauthorized?: boolean } = {
        headers,
        timeout: effectiveTimeout,
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
    fragmentRequest.setTimeout(effectiveTimeout, fragmentRequest.abort);

    return fragmentRequest;
}
