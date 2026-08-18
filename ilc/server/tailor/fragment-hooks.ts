import type { IncomingHttpHeaders } from 'http';
import _ from 'lodash';
import type { Logger } from 'ilc-plugins-sdk';
import { appIdToNameAndSlot } from '../../common/utils';
import { getCacheMarker } from './request-fragment-cache';
import type { FragmentAttributes, FragmentWrapperConf } from './fragment-attributes';

const parseLinkHeader = require('@namecheap/tailorx/lib/parse-link-header') as (
    linkHeader: string,
) => Array<{ uri?: string; rel?: string; params: Record<string, string> }>;

interface BundleVersionOverrides {
    wrapperPropsOverride?: Record<string, unknown>;
    cssBundle?: string;
    spaBundle?: string;
    dependencies?: Record<string, string>;
    appName?: string;
}

function asyncStylesLoadTemplate(uri: string, id: string): string {
    return (
        '<script>(function(url, id){' +
        `const link = document.head.querySelector('link[data-fragment-id="' + id + '"]');` +
        'if (link && link.href !== url) {' +
        `link.href = url;` +
        '}' +
        `})("${uri}", "${id}");</script>`
    );
}

export function insertStart(
    logger: Logger,
    stream: NodeJS.WritableStream,
    attributes: FragmentAttributes,
    headers: IncomingHttpHeaders,
): void {
    // Set by request-fragment-cache through an internal channel a real fragment cannot reach,
    // unlike a response header it could spoof
    const cacheMarker = getCacheMarker(attributes);
    if (cacheMarker) {
        stream.write(`<!-- ilc:fragment-cache ${cacheMarker.toUpperCase()} -->`);
    }

    const bundleVersionOverrides: BundleVersionOverrides = _.pick(attributes, ['wrapperPropsOverride']);

    const clientIsSupported = !!attributes.spaBundleUrl;
    if (clientIsSupported && headers.link) {
        const refs = parseLinkHeader(headers.link as string);
        logger.debug(
            {
                detailsJSON: JSON.stringify({
                    attributes,
                    refs,
                }),
            },
            'insertStart. Links detected. Debug Attributes',
        );
        const { async: isAsync, id } = attributes;

        refs.forEach((ref) => {
            if (!ref.uri) {
                logger.error(`insertStart. Link header has no uri "${id}": ${JSON.stringify(ref)}`);
                return;
            }

            if (ref.rel === 'stylesheet') {
                const uri = fixUri(attributes, ref.uri);
                bundleVersionOverrides.cssBundle = uri;
                stream.write(
                    isAsync
                        ? `<!-- Async fragments are not fully implemented yet: ${uri} -->`
                        : id
                          ? asyncStylesLoadTemplate(uri, id)
                          : '',
                );
            } else if (ref.rel === 'fragment-script') {
                bundleVersionOverrides.spaBundle = fixUri(attributes, ref.uri);
            } else if (ref.rel === 'fragment-dependency' && ref.params.name) {
                if (bundleVersionOverrides.dependencies === undefined) {
                    bundleVersionOverrides.dependencies = {};
                }
                bundleVersionOverrides.dependencies[ref.params.name] = fixUri(attributes, ref.uri);
            }
        });
    }

    if (Object.keys(bundleVersionOverrides).length <= 0) {
        return;
    }

    if (bundleVersionOverrides.spaBundle) {
        // We need appName at client side to properly perform override System.js import map
        // See client side code in AsyncBootUp.js
        const appId = attributes.wrapperConf
            ? (attributes.wrapperConf as FragmentWrapperConf).appId
            : (attributes.id as string);
        bundleVersionOverrides.appName = appIdToNameAndSlot(appId).appName;
    }

    logger.debug(
        {
            detailsJSON: JSON.stringify({
                attributes,
                bundleVersionOverrides,
            }),
        },
        'insert start. Creating text/spa-config-override tag',
    );
    stream.write(`<script type="text/spa-config-override">${JSON.stringify(bundleVersionOverrides)}</script>`);
}

export function insertEnd(
    _stream: NodeJS.WritableStream,
    _attributes: FragmentAttributes,
    _headers: IncomingHttpHeaders,
    _index?: number,
): void {
    // disabling default TailorX behaviour
}

function fixUri(fragmentAttrs: FragmentAttributes, uri: string): string {
    const { spaBundleUrl } = fragmentAttrs;
    return new URL(uri, spaBundleUrl).href;
}
