'use strict';
const ACCEPT_HEADERS = [
    'authorization',
    'accept-language',
    'referer',
    'user-agent',
    'x-request-uri',
    'x-request-host',
    'x-request-intl',
    'cookie',
];

/**
 * Filter the request headers that are passed to fragment request.
 * @callback filterHeaders
 *
 * @param {Object} attributes - Attributes object of the fragment node
 * @param {string} attributes.public - Denotes the public fragment.
 * @param {Object} request - HTTP Request object
 * @param {Object} request.headers - request header object
 * @returns {Object} New filtered header object
 */
module.exports = (attributes, request) => {
    const {public: isPublic} = attributes;
    const {headers = {}} = request;
    // Headers are not forwarded to public fragment for security reasons

    if (isPublic) {
        return {};
    }

    return Object.keys(headers).reduce((newHeaders, key) => {
        if ((ACCEPT_HEADERS.includes(key) || key.startsWith('x-forwarded')) && headers[key]) {
            newHeaders[key] = headers[key]
        }

        return newHeaders;
    }, {});
};
