'use strict';

/**
 * WARNING!!! Original source code was taken from v3.9.2 https://github.com/zalando/tailor/blob/887621ac38310b2ccb4acb75f079e8dd4f6d5490/lib/request-handler.js
 */

const AsyncStream = require('node-tailor/lib/streams/async-stream');
const ContentLengthStream = require('node-tailor/lib/streams/content-length-stream');
const { TEMPLATE_NOT_FOUND } = require('node-tailor/lib/fetch-template');
const processTemplate = require('node-tailor/lib/process-template');
const {
    getLoaderScript,
    getFragmentAssetsToPreload,
    nextIndexGenerator
} = require('node-tailor/lib/utils');
const HeadInjectorStream = require('./head-injector-stream');
const ConfigsInjectorStream = require('./configs-injector-stream');

const { globalTracer, Tags, FORMAT_HTTP_HEADERS } = require('opentracing');
const tracer = globalTracer();

// Events emitted by fragments on the template
const FRAGMENT_EVENTS = [
    'start',
    'response',
    'end',
    'error',
    'timeout',
    'fallback',
    'warn'
];
// Occurs when Template parsing fails/Primary Fragment Errors out
const INTERNAL_SERVER_ERROR = 'Internal Server Error';

/**
 * Process the HTTP Request to the Tailor Middleware
 *
 * @param {Object} options - Options object passed to Tailor
 * @param {Object} request - HTTP request stream of Middleware
 * @param {Object} response - HTTP response stream of middleware
 */
module.exports = function processRequest(options, request, response) {
    this.emit('start', request);
    const bundleVersionOverride = {};
    const parentSpanContext = tracer.extract(
        FORMAT_HTTP_HEADERS,
        request.headers
    );
    const spanOptions = parentSpanContext ? { childOf: parentSpanContext } : {};
    const span = tracer.startSpan('compose_page', spanOptions);
    span.addTags({
        [Tags.HTTP_URL]: request.url,
        [Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER
    });

    const {
        fetchContext,
        fetchTemplate,
        parseTemplate,
        filterResponseHeaders,
        maxAssetLinks,
        amdLoaderUrl
    } = options;

    const asyncStream = new AsyncStream();
    asyncStream.once('plugged', () => {
        asyncStream.end();
    });

    const contextPromise = fetchContext(request).catch(err => {
        this.emit('context:error', request, err);
        return {};
    });
    const templatePromise = fetchTemplate(request, parseTemplate);
    const responseHeaders = {
        // Disable cache in browsers and proxies
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        'Content-Type': 'text/html'
    };

    let shouldWriteHead = true;

    const contentLengthStream = new ContentLengthStream(contentLength => {
        this.emit('end', request, contentLength);
        span.finish();
    });

    const handleError = err => {
        this.emit('error', request, err);
        const { message, stack } = err;
        span.setTag(Tags.ERROR, true);
        span.log({ message, stack });
        if (shouldWriteHead) {
            shouldWriteHead = false;
            let statusCode = 500;
            if (err.code === TEMPLATE_NOT_FOUND || (err.data && err.data.code === TEMPLATE_NOT_FOUND)) {
                statusCode = 404;
            }
            span.setTag(Tags.HTTP_STATUS_CODE, statusCode);

            response.writeHead(statusCode, responseHeaders);
            // To render with custom error template
            if (typeof err.presentable === 'string') {
                response.end(`${err.presentable}`);
            } else if (err.data && typeof err.data.presentable === 'string') {
                response.end(`${err.data.presentable}`);
            } else {
                response.end(INTERNAL_SERVER_ERROR);
            }
            span.finish();
        } else {
            contentLengthStream.end();
        }
    };

    const handlePrimaryFragment = (fragment, resultStream) => {
        if (!shouldWriteHead) {
            return;
        }

        shouldWriteHead = false;

        fragment.once('response', (statusCode, headers) => {
            // Map response headers
            if (typeof filterResponseHeaders === 'function') {
                Object.assign(
                    responseHeaders,
                    filterResponseHeaders(fragment.attributes, headers)
                );
            }

            if (headers.location) {
                responseHeaders.location = headers.location;
            }

            // Make resources early discoverable while processing HTML
            const assetsToPreload = getFragmentAssetsToPreload(
                fragment.styleRefs,
                fragment.scriptRefs,
                request.headers
            );

            // Loader script must be preloaded before every fragment asset
            const loaderScript = getLoaderScript(amdLoaderUrl, request.headers);
            loaderScript !== '' && assetsToPreload.unshift(loaderScript);

            responseHeaders.link = assetsToPreload.join(',');
            this.emit('response', request, statusCode, responseHeaders);

            const injector = new HeadInjectorStream(headers);

            response.writeHead(statusCode, responseHeaders);
            resultStream.pipe(injector).pipe(contentLengthStream).pipe(response);
        });

        fragment.once('fallback', err => {
            this.emit('error', request, err);
            span.setTag(Tags.HTTP_STATUS_CODE, 500);
            response.writeHead(500, responseHeaders);
            resultStream.pipe(contentLengthStream).pipe(response);
        });

        fragment.once('error', err => {
            this.emit('error', request, err);
            span.addTags({
                [Tags.ERROR]: true,
                [Tags.HTTP_STATUS_CODE]: 500
            });
            span.log({
                message: err.message,
                stack: err.stack
            });
            response.writeHead(500, responseHeaders);
            response.end(INTERNAL_SERVER_ERROR);
            span.finish();
        });
    };

    Promise.all([templatePromise, contextPromise])
        .then(([parsedTemplate, context]) => {
            // extendedOptions are mutated inside processTemplate
            const extendedOptions = Object.assign({}, options, {
                nextIndex: nextIndexGenerator(0, maxAssetLinks),
                parentSpan: span,
                asyncStream
            });

            const resultStream = processTemplate(
                request,
                extendedOptions,
                context
            );
            let isFragmentFound = false;

            const injector = new ConfigsInjectorStream(bundleVersionOverride, options.registrySvc, options.cdnUrl);
            resultStream.pipe(injector);


            resultStream.on('fragment:found', fragment => {
                isFragmentFound = true;
                const { attributes } = fragment;
                FRAGMENT_EVENTS.forEach(eventName => {
                    fragment.once(eventName, (...args) => {
                        const prefixedName = 'fragment:' + eventName;

                        if (prefixedName === 'fragment:response' && args[1]['x-bundle-overrides'] !== undefined) {
                            bundleVersionOverride[attributes.id] = args[1]['x-bundle-overrides']; //headers
                        }

                        this.emit(prefixedName, request, attributes, ...args);
                    });
                });

                attributes.primary &&
                handlePrimaryFragment(fragment, injector);
            });

            resultStream.once('finish', () => {
                const statusCode = response.statusCode || 200;
                if (shouldWriteHead) {
                    shouldWriteHead = false;
                    // Preload the loader script when at least
                    // one fragment is present on the page
                    if (isFragmentFound) {
                        const loaderScript = getLoaderScript(
                            amdLoaderUrl,
                            request.headers
                        );
                        loaderScript !== '' &&
                        (responseHeaders.link = loaderScript);
                    }
                    this.emit('response', request, statusCode, responseHeaders);

                    response.writeHead(statusCode, responseHeaders);
                    injector.pipe(contentLengthStream).pipe(response);
                }
            });

            resultStream.once('error', handleError);

            parsedTemplate.forEach(item => resultStream.write(item));
            resultStream.end();
        })
        .catch(err => {
            handleError(err);
        });
};