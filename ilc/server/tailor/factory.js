'use strict';

const _ = require('lodash');
const newrelic = require('newrelic');

const logger = require('../logger');
const Tailor = require('tailorx');
const fetchTemplate = require('./fetch-template');
const Router = require('./server-router');
const filterHeaders = require('./filter-headers');
const errorHandlingService = require('../errorHandler/factory');
const errorHandlerSetup = require('./error-handler');
const fragmentHooks = require('./fragment-hooks');
const ConfigsInjector = require('./configs-injector');
const processFragmentResponse = require('./process-fragment-response');
const {getLocaleFromUrl} = require('../i18n');

module.exports = function (registryService, cdnUrl, nrCustomClientJsWrapper = null) {
    const router = new Router(logger, v => getLocaleFromUrl(v) ? getLocaleFromUrl(v).route : v);
    const configsInjector = new ConfigsInjector(newrelic, cdnUrl, nrCustomClientJsWrapper);

    const tailor = new Tailor({
        fetchTemplate: fetchTemplate(
            __dirname + '/templates',
            router,
            configsInjector,
            newrelic,
            registryService
        ),
        processFragmentResponse,
        systemScripts: '',
        filterHeaders,
        fragmentHooks,
        botsGuardEnabled: true,
        getAssetsToPreload: configsInjector.getAssetsToPreload,
        filterResponseHeaders: (attributes, headers) => _.pick(headers, ['set-cookie']),
        baseTemplatesCacheSize: 1,
        shouldSetPrimaryFragmentAssetsToPreload: false,
    });

    errorHandlerSetup(tailor, errorHandlingService);

    return tailor;
};
