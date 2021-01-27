'use strict';

const errors = require('./errors');

/**
 * @param {http.ServerResponse} response - fragment response
 * @param {Object} context - contextual info about request
 * @param {http.IncomingMessage} context.request - incoming request from browser
 * @param {Object} context.fragmentAttributes - fragment attributes map
 * @param {String} context.fragmentUrl - URL that was requested on fragment
 * @param {String} context.isWrapper - Indicates if App Wrapper is requested
 */
module.exports = (response, context) => {
    const currRoute = context.request.router.getRoute();

    if (
        context.fragmentAttributes.primary &&
        response.statusCode === 404 &&
        parseInt(currRoute.specialRole) !== 404 &&
        response.headers['x-ilc-override'] !== 'error-page-content'
    ) {
        throw new errors.Fragment404Response();
    }

    const isPrimaryError = response.statusCode >= 500;
    const isNonPrimaryError =
        (response.statusCode < 200 || response.statusCode >= 300) &&
        !context.fragmentAttributes.primary;

    if (isPrimaryError || isNonPrimaryError) {
        throw new Error(
            `Request error for ${context.isWrapper ? 'App Wrapper' : 'Fragment'}. statusCode: ${response.statusCode}; statusMessage: ${response.statusMessage}; url: ${context.fragmentUrl};`
        );
    }

    return response;
};
