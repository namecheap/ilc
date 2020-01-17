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


    tailor.on('error', tailorErrorHandler);

    return tailor;
};


//TODO: refactor this
const errorNotifier = require('./server/errors/errorNotifier');
const ejs = require('ejs');
const uuidv4 = require('uuid/v4');
const { TEMPLATE_NOT_FOUND } = require('node-tailor/lib/fetch-template');

async function tailorErrorHandler(err, req, res) {
    const errorId = uuidv4();
    const isNoTemplate = err.code === TEMPLATE_NOT_FOUND || (Boolean(err.data) && err.data.code === TEMPLATE_NOT_FOUND);

    const data = await registryService.getTemplate('500');

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.status(500).send(ejs.render(data.data.content, { errorId }));

    errorNotifier.notify(err, {
        type: 'TAILOR_ERROR',
        name: err.toString(),
        extraInfo: {
            errorId,
            isNoTemplate,
        },
    });
}
