'use strict';

const urljoin = require('url-join');

const Tailor = require('./tailor/Tailor');
const fetchTemplate = require('./tailor/fetch-template');
const Router = require('./router/ServerRouter');
const Registry = require('./Registry');

module.exports = function (registryAddr, cdnUrl) {
    const registry = new Registry(registryAddr);

    return new Tailor({
        amdLoaderUrl: cdnUrl === null ? '/_ilc/system.js' : urljoin(cdnUrl, '/system.js'),
        fetchTemplate: fetchTemplate(
            __dirname + '/templates',
            new Router(registry)
        ),
        systemScripts: '',
        registrySvc: registry,
        cdnUrl,
    });
};
