'use strict';

/**
 * WARNING!!! Original source code was taken from v3.9.2 https://github.com/zalando/tailor/blob/2fe19ecfad66ca3200a5a1a73bae269daa8bea8c/index.js
 */

//MONKEY PATCHING START
require('./monkey/fragment');
//MONKEY PATCHING END

const path = require('path');
const fs = require('fs');
const EventEmitter = require('events').EventEmitter;
const requestHandler = require('./request-handler');
const fetchTemplate = require('node-tailor/lib/fetch-template');
const parseTemplate = require('node-tailor/lib/parse-template');
const requestFragment = require('node-tailor/lib/request-fragment');
const filterReqHeadersFn = require('node-tailor/lib/filter-headers');
const { initTracer } = require('node-tailor/lib/tracing');
const PIPE_DEFINITION = fs.readFileSync(
    require.resolve('node-tailor/src/pipe.min.js')
);
const { getCrossOrigin } = require('node-tailor/lib/utils');

const AMD_LOADER_URL =
    'https://cdnjs.cloudflare.com/ajax/libs/require.js/2.1.22/require.min.js';

const stripUrl = fileUrl => path.normalize(fileUrl.replace('file://', ''));
const getPipeAttributes = attributes => {
    const { primary, id } = attributes;
    return {
        primary: !!(primary || primary === ''),
        id
    };
};

module.exports = class Tailor extends EventEmitter {

    /**
     * @param {Object} options
     * @param {String} [options.systemScripts] - Provides ability to inject system scripts right after AMD loader & Pipe code declaration.
     * @param {Function} [options.fetchContext] - Function that returns a promise of the context, that is an object that maps fragment id to fragment url, to be able to override urls of the fragments on the page, defaults to Promise.resolve({})
     * @param {Function} [options.fetchTemplate] - Function that should fetch the template, call parseTemplate and return a promise of the result. Useful to implement your own way to retrieve and cache the templates, e.g. from s3. Default implementation lib/fetch-template.js fetches the template from the file system
     * @param {String} [options.templatesPath] - To specify the path where the templates are stored locally, Defaults to /templates/
     * @param {String} [options.fragmentTag] - Name of the fragment tag, defaults to fragment
     * @param {String[]} [options.handledTags] - An array of custom tags, check tests/handle-tag for more info
     * @param {Function} [options.handleTag] - Function that filters the request headers that are passed to fragment request, check default implementation in lib/filter-headers
     * //TODO: add rest of the options
     */
    constructor(options) {
        super();
        const {
            amdLoaderUrl = AMD_LOADER_URL,
            filterRequestHeaders = options.filterHeaders || filterReqHeadersFn,
            maxAssetLinks,
            templatesPath
        } = options;

        options.maxAssetLinks = isNaN(maxAssetLinks)
            ? 1
            : Math.max(1, maxAssetLinks);

        let memoizedDefinition;
        const pipeChunk = (pipeInstanceName, { host } = {}) => {
            if (!memoizedDefinition) {
                // Allow reading from fs for inlining AMD
                if (amdLoaderUrl.startsWith('file://')) {
                    let fileData = fs.readFileSync(
                        stripUrl(amdLoaderUrl),
                        'utf-8'
                    );
                    memoizedDefinition = `<script>${fileData}\n`;
                } else {
                    memoizedDefinition = `<script src="${amdLoaderUrl}" ${getCrossOrigin(
                        amdLoaderUrl,
                        host
                    )}></script>\n<script>`;
                }
            }

            let result = `${memoizedDefinition}var ${pipeInstanceName}=${PIPE_DEFINITION}</script>\n`;

            if (options.systemScripts !== undefined) {
                result += options.systemScripts + "\n";
            }

            return Buffer.from(result);
        };

        const requestOptions = Object.assign(
            {
                amdLoaderUrl,
                fetchContext: () => Promise.resolve({}),
                fetchTemplate: fetchTemplate(
                    templatesPath || path.join(process.cwd(), 'templates')
                ),
                fragmentTag: 'fragment',
                handledTags: [],
                handleTag: () => '',
                requestFragment: requestFragment(filterRequestHeaders),
                pipeInstanceName: 'Pipe',
                pipeDefinition: pipeChunk,
                pipeAttributes: getPipeAttributes
            },
            options
        );

        initTracer(options.tracer);

        requestOptions.parseTemplate = parseTemplate(
            [requestOptions.fragmentTag].concat(requestOptions.handledTags),
            ['meta', requestOptions.fragmentTag]
        );

        this.requestHandler = requestHandler.bind(this, requestOptions);
        // To Prevent from exiting the process - https://nodejs.org/api/events.html#events_error_events
        this.on('error', () => {});
    }
};