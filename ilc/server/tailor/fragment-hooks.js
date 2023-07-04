'use strict';

const _ = require('lodash');
const parseLinkHeader = require('@namecheap/tailorx/lib/parse-link-header');

const { appIdToNameAndSlot } = require('../../common/utils');

function asyncStylesLoadTemplate(uri, id) {
    return (
        '<script>(function(url, id){' +
        `const link = document.head.querySelector('link[data-fragment-id="' + id + '"]');` +
        'if (link && link.href !== url) {' +
        `link.href = url;` +
        '}' +
        `})("${uri}", "${id}");</script>`
    );
}

function insertStart(logger, stream, attributes, headers) {
    const bundleVersionOverrides = _.pick(attributes, ['wrapperPropsOverride']);

    const clientIsSupported = !!attributes.spaBundleUrl;
    if (clientIsSupported && headers.link) {
        const refs = parseLinkHeader(headers.link);
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
        const appId = attributes.wrapperConf ? attributes.wrapperConf.appId : attributes.id;
        bundleVersionOverrides.appName = appIdToNameAndSlot(appId).appName;
    }

    logger.debug(
        {
            detailsJSON: JSON.stringify({
                attributes,
                bundleVersionOverrides,
            }),
        },
        'insert start. Creating spa-config-override tag',
    );
    stream.write(`<script type="spa-config-override">${JSON.stringify(bundleVersionOverrides)}</script>`);
}

function insertEnd(stream, attributes, headers, index) {
    // disabling default TailorX behaviour
}

function fixUri(fragmentAttrs, uri) {
    const { spaBundleUrl } = fragmentAttrs;
    return new URL(uri, spaBundleUrl).href;
}

module.exports = {
    insertStart,
    insertEnd,
};
