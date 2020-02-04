'use strict';

const Tailor = require('tailorx');
const fetchTemplate = require('./fetch-template');
const Router = require('../../common/router/ServerRouter');
const registryService = require('../registry/factory');
const filterHeaders = require('./filter-headers');
const errorHandlerSetup = require('./error-handler');
const fragmentHooks = require('./fragment-hooks');
const ConfigsInjector = require('./configs-injector');

module.exports = function (cdnUrl) {
    const tailor = new Tailor({
        fetchTemplate: fetchTemplate(
            __dirname + '/templates',
            new Router(registryService, console),
            new ConfigsInjector(registryService, cdnUrl)
        ),
        systemScripts: '',
        filterHeaders,
        fragmentHooks,
        botsGuardEnabled: true,
    });

    errorHandlerSetup(tailor);

    return tailor;
};
