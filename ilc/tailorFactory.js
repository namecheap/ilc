'use strict';

const Tailor = require('./tailor/Tailor');
const fetchTemplate = require('./tailor/fetch-template');
const Router = require('./router/ServerRouter');
const Registry = require('./Registry');

module.exports = function (registryAddr, cdnUrl) {
    const registry = new Registry(registryAddr);

    return new Tailor({
        amdLoaderUrl: cdnUrl === null ? '/system.js' : cdnUrl + '/system.js',
        fetchTemplate: fetchTemplate(
            __dirname + '/templates',
            new Router(registry)
        ),
        systemScripts: '',
        registrySvc: registry,
        cdnUrl,
    });
};