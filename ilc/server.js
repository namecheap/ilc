const newrelic = require('newrelic');

const ejs = require('ejs');
const uuidv4 = require('uuid/v4');
const config = require('config');
const { TEMPLATE_NOT_FOUND } = require('node-tailor/lib/fetch-template');
const server = require('./http');
const app = require('express')();
const tailorFactory = require('./tailorFactory');
const serveStatic = require('./serveStatic');
const apiRegistry = require('./api/apiRegistry');

setupAppHealthCheck().then(() => setupApp());

function setupApp() {
    const tailor = tailorFactory(config.get('cdnUrl'));

    tailor.on('error', (err, req, res) => {
        const errorId = uuidv4();
        const isNoTemplate = err.code === TEMPLATE_NOT_FOUND || (Boolean(err.data) && err.data.code === TEMPLATE_NOT_FOUND);

        apiRegistry.getTemplateByTemplateName('500').then((data) => {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.status(500).send(ejs.render(data.data.content, { errorId }));
        });

        noticeError(err, {
            type: 'TAILOR_ERROR',
            name: err.toString(),
            extraInfo: {
                errorId,
                isNoTemplate,
            },
        });
    });

    app.use('/_ilc/', serveStatic(config.get('productionMode')));

    app.get('/_ilc/page/500', (req, res) => {
        apiRegistry.getTemplateByTemplateName('500').then((data) => {
            res.status(200).send(data.data.content);
        });
    });

    app.get('*', (req, res) => {
        req.headers['x-request-uri'] = req.url; //TODO: to be removed & replaced with routerProps

        tailor.requestHandler(req, res);
    });

    app.use((err, req, res, next) => {
        const errorId = uuidv4();

        apiRegistry.getTemplateByTemplateName('500').then((data) => {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.status(500).send(ejs.render(data.data.content, { errorId }));
        });

        noticeError(err, {
            type: 'SERVER_ERROR',
            name: err.toString(),
            extraInfo: {
                errorId,
            },
        });
    });

    app.disable('x-powered-by');

    server(app);
}

function setupAppHealthCheck() {
    return new Promise((resolve) => {
        let intervalId;

        intervalId = setInterval(() => {
            // Initializing 500 error page to cache template of this page
            // to avoid a situation when registry can't return this template in future
            apiRegistry.getTemplateByTemplateName('500').then(() => {
                console.log('500 error page template cached');

                app.get('/ping', (req, res) => res.send('pong'));

                clearInterval(intervalId);
                resolve();
            }).catch(() => { });
        }, 1000);
    });
}

function noticeError(err, errInfo = {}) {
    if (newrelic && newrelic.noticeError) {
        newrelic.noticeError(err, JSON.stringify(errInfo));
    }
    console.error(errInfo);
}
