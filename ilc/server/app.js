const config = require('config');
const fastify = require('fastify');
const tailorFactory = require('./tailor/factory');
const serveStatic = require('./serveStatic');
const registryServiceImport = require('./registry/factory');
const errorHandlingService = require('./errorHandler/factory');
const i18n = require('./i18n');

module.exports = (registryService = registryServiceImport) => {
    const app = fastify(Object.assign({
        trustProxy: false, //TODO: should be configurable via Registry
    }, require('./logger/fastify')));

    app.addHook('onRequest', (req, res, done) => {
        req.raw.ilcState = {};
        done();
    });
    app.addHook('onRequest', i18n.onRequest);

    const tailor = tailorFactory(
        registryService,
        config.get('cdnUrl'),
        config.get('newrelic.customClientJsWrapper'),
    );

    if (config.get('cdnUrl') === null) {
        app.use('/_ilc/', serveStatic(config.get('productionMode')));
    }

    app.register(require('./ping'));

    app.get('/_ilc/api/v1/registry/template/:templateName', async (req, res) => {
        const data = await registryService.getTemplate(req.params.templateName);
        return res.status(200).send(data.data.content);
    });

    // Route to test 500 page appearance
    app.get('/_ilc/500', async () => { throw new Error('500 page test error') });

    app.all('*', (req, res) => {
        req.headers['x-request-host'] = req.hostname;
        req.headers['x-request-uri'] = req.raw.url;
        tailor.requestHandler(req.raw, res.res);
    });

    app.setErrorHandler(errorHandlingService.handleError);

    return app;
};
