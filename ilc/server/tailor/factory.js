'use strict';

const _ = require('lodash');
const newrelic = require('newrelic');

const Tailor = require('@namecheap/tailorx');
const fetchTemplate = require('./fetch-template');
const filterHeaders = require('./filter-headers');
const errorHandlerSetup = require('./error-handler');
const fragmentHooks = require('./fragment-hooks');
const ConfigsInjector = require('./configs-injector');
const processFragmentResponse = require('./process-fragment-response');
const requestFragment = require('./request-fragment');

module.exports = function (
    registryService,
    errorHandlingService,
    cdnUrl,
    nrCustomClientJsWrapper = null,
    nrAutomaticallyInjectClientScript = true,
    logger,
) {
    const configsInjector = new ConfigsInjector(
        newrelic,
        cdnUrl,
        nrCustomClientJsWrapper,
        nrAutomaticallyInjectClientScript,
    );

    const tailor = new Tailor({
        fetchContext: async function (request) {
            return request.router.getFragmentsContext();
        },
        fetchTemplate: fetchTemplate(configsInjector, newrelic, registryService),
        requestFragment: requestFragment(filterHeaders, processFragmentResponse, logger),
        processFragmentResponse,
        systemScripts: '',
        filterHeaders,
        fragmentHooks: {
            insertStart: fragmentHooks.insertStart.bind(null, logger),
            insertEnd: fragmentHooks.insertEnd,
        },
        botsGuardEnabled: true,
        getAssetsToPreload: configsInjector.getAssetsToPreload,
        filterResponseHeaders: (attributes, headers) => _.pick(headers, ['set-cookie']),
        baseTemplatesCacheSize: 1,
        shouldSetPrimaryFragmentAssetsToPreload: false,
    });

    errorHandlerSetup(tailor, errorHandlingService);

    return tailor;
};
