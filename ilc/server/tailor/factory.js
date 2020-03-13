'use strict';

const _ = require('lodash');
const newrelic = require('newrelic');

const Tailor = require('tailorx');
const fetchTemplate = require('./fetch-template');
const Router = require('../../common/router/ServerRouter');
const registryService = require('../registry/factory');
const filterHeaders = require('./filter-headers');
const errorHandlerSetup = require('./error-handler');
const fragmentHooks = require('./fragment-hooks');
const ConfigsInjector = require('./configs-injector');


module.exports = function (cdnUrl) {
    const router = new Router(registryService, console);
    const configsInjector = new ConfigsInjector(registryService, router, cdnUrl);

    const tailor = new Tailor({
        fetchTemplate: fetchTemplate(
            __dirname + '/templates',
            router,
            configsInjector,
            newrelic
        ),
        systemScripts: '',
        filterHeaders,
        fragmentHooks,
        botsGuardEnabled: true,
        getAssetsToPreload: configsInjector.getAssetsToPreload,
        filterResponseHeaders: (attributes, headers) => _.pick(headers, ['set-cookie']),
        baseTemplatesCacheSize: 1,
    });

    errorHandlerSetup(tailor);

    return tailor;
};
