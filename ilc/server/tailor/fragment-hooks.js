'use strict';

const parseLinkHeader = require('tailorx/lib/parse-link-header');

function insertStart(stream, attributes, headers, index) {
    if (!headers.link) {
        return;
    }

    const refs = parseLinkHeader(headers.link);
    const { async: isAsync, id } = attributes;

    const bundleVersionOverrides = {};

    refs.forEach(ref => {
        if (ref.rel === 'stylesheet') {
            bundleVersionOverrides.cssBundle = ref.uri;
            stream.write(
                isAsync
                    ? `<!-- Async fragments are not fully implemented yet: ${ref.uri} -->`
                    : id
                        ?
                            '<script>(function(url, id){' + 
                                `const link = document.head.querySelector('link[data-fragment-id="' + id + '"]');` +
                                'if (link && link.href !== url) {' +
                                    `link.href = url;` +
                                '}' +
                            `})("${ref.uri}", "${id}");</script>`
                        : ''
            );
        } else if (ref.rel === 'fragment-script') {
            bundleVersionOverrides.spaBundle = ref.uri;
        } else if (ref.rel === 'fragment-dependency' && ref.params.name) {
            if (bundleVersionOverrides.dependencies === undefined) {
                bundleVersionOverrides.dependencies = {};
            }
            bundleVersionOverrides.dependencies[ref.params.name] = ref.uri;
        }
    });

    if (Object.keys(bundleVersionOverrides).length > 0) {
        stream.write(`<script type="spa-config-override">${JSON.stringify({[id]: bundleVersionOverrides})}</script>`);
    }
}

function insertEnd(stream, attributes, headers, index) {
    //TODO: document.currentScript doesn't work in IE, pass slot name via custom TailorX props
    //TODO: pass spa-config-override here
    //TODO: Move link related script here
    stream.write(`<script>` +
        `window.ilcApps.push({slotName: document.currentScript.parentElement.id, appName: '${attributes.id}'});` +
        `</script>`);
}

module.exports = {
    insertStart,
    insertEnd,
};
