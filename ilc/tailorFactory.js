'use strict';

const urljoin = require('url-join');

const Tailor = require('./tailor/Tailor');
const fetchTemplate = require('./tailor/fetch-template');
const Router = require('./router/ServerRouter');
const registryService = require('./server/registry/factory');

module.exports = function (cdnUrl) {
    const tailor = new Tailor({
        amdLoaderUrl: cdnUrl === null ? '/_ilc/system.js' : urljoin(cdnUrl, '/system.js'),
        fetchTemplate: fetchTemplate(
            __dirname + '/templates',
            new Router(registryService)
        ),
        systemScripts: '',
        registrySvc: registryService,
        cdnUrl,
    });


    tailor.on('error', (req, err) => {
        console.error('Tailor error:');
        console.error(err);
    });

    return tailor;
};
