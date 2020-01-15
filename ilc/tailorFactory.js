'use strict';

const urljoin = require('url-join');

const Tailor = require('./tailor/Tailor');
const fetchTemplate = require('./tailor/fetch-template');
const Router = require('./router/ServerRouter');
const apiRegistry = require('./api/apiRegistry');

module.exports = function (cdnUrl) {
    return new Tailor({
        amdLoaderUrl: cdnUrl === null ? '/_ilc/system.js' : urljoin(cdnUrl, '/system.js'),
        fetchTemplate: fetchTemplate(
            __dirname + '/templates',
            new Router(apiRegistry)
        ),
        systemScripts: '',
        registrySvc: apiRegistry,
        cdnUrl,
    });
};
