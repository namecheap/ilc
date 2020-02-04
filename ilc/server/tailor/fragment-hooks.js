'use strict';

const parseLinkHeader = require('tailorx/lib/parse-link-header');

function insertStart(stream, attributes, headers, index) {
    const refs = parseLinkHeader(headers.link);
    const { async: isAsync, id } = attributes;

    const bundleVersionOverrides = {};

    refs.forEach(ref => {
        if (ref.rel === 'stylesheet') {
            bundleVersionOverrides.cssBundle = ref.uri;
            stream.write(
                isAsync
                    ? `<!-- Async fragments are not fully implemented yet: ${ref.uri} -->`
                    : `<link rel="stylesheet" href="${ref.uri}"${
                        id !== undefined
                            ? ` data-fragment-id="${id}"`
                            : ''
                        }>`
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
    //disabling default behaviour
}

module.exports = {
    insertStart,
    insertEnd,
};
