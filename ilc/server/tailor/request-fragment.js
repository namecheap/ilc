'use strict';

const http = require('http');
const https = require('https');
const url = require('url');
const Agent = require('agentkeepalive');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const deepmerge = require('deepmerge');

// By default tailor supports gzipped response from fragments
const requiredHeaders = {
    'accept-encoding': 'gzip, deflate'
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
module.exports = (filterHeaders, processFragmentResponse) => function requestFragment(
    fragmentUrl,
    attributes,
    request
) {
    return new Promise((resolve, reject) => {
        const currRoute = request.router.getRoute();

        if (attributes.wrapperConf) {
            const wrapperConf = attributes.wrapperConf;
            const reqUrl = makeFragmentUrl(currRoute, wrapperConf.src, wrapperConf.appId, wrapperConf.props);

            const fragmentRequest = makeRequest(
                reqUrl,
                {...filterHeaders(attributes, request), ...requiredHeaders},
                wrapperConf.timeout,
                attributes.ignoreInvalidSsl,
            );

            fragmentRequest.on('response', response => {
                try {
                    // Wrapper says that we need to request wrapped application
                    if (response.statusCode === 210) {
                        const propsOverride = response.headers['x-props-override'];
                        attributes.wrapperPropsOverride = {};
                        if (propsOverride) {
                            const props = JSON.parse(Buffer.from(propsOverride, 'base64').toString('utf8'));
                            attributes.appProps = deepmerge(attributes.appProps, props);
                            attributes.wrapperPropsOverride = props;
                        }
                        attributes.wrapperConf = null;

                        resolve(requestFragment(fragmentUrl, attributes, request));

                        return;
                    }

                    resolve(
                        processFragmentResponse(response, {
                            request,
                            fragmentUrl: reqUrl,
                            fragmentAttributes: attributes,
                            isWrapper: true,
                        })
                    );
                } catch (e) {
                    reject(e);
                }
            });
            fragmentRequest.on('error', reject);
            fragmentRequest.end();
        } else {
            const reqUrl = makeFragmentUrl(currRoute, fragmentUrl, attributes.id, attributes.appProps);

            const fragmentRequest = makeRequest(
                reqUrl,
                {...filterHeaders(attributes, request), ...requiredHeaders},
                attributes.timeout,
                attributes.ignoreInvalidSsl,
            );

            fragmentRequest.on('response', response => {
                try {
                    resolve(
                        processFragmentResponse(response, {
                            request,
                            fragmentUrl: reqUrl,
                            fragmentAttributes: attributes,
                        })
                    );
                } catch (e) {
                    reject(e);
                }
            });
            fragmentRequest.on('error', reject);
            fragmentRequest.end();
        }
    });
}

function makeFragmentUrl(route, baseUrl, appId, props) {
    const url = new URL(baseUrl);

    const reqProps = {
        basePath: route.basePath,
        reqUrl: route.reqUrl,
        fragmentName: appId,
    };

    url.searchParams.append('routerProps', Buffer.from(JSON.stringify(reqProps)).toString('base64'));

    if (props) {
        url.searchParams.append('appProps', Buffer.from(JSON.stringify(props)).toString('base64'));
    }

    return url.toString();
}

function makeRequest(reqUrl, headers, timeout, ignoreInvalidSsl = false) {
    const options = {
        headers,
        timeout,
        ...url.parse(reqUrl)
    };

    const { protocol: reqProtocol } = options;
    const hasHttpsProtocol = reqProtocol === 'https:';
    const protocol = hasHttpsProtocol ? https : http;
    options.agent = hasHttpsProtocol ? kaAgentHttps : kaAgent;

    if (hasHttpsProtocol && ignoreInvalidSsl) {
        options.rejectUnauthorized = false;
    }

    const fragmentRequest = protocol.request(options);

    if (timeout) {
        fragmentRequest.setTimeout(timeout, fragmentRequest.abort);
    }

    return fragmentRequest;
}
