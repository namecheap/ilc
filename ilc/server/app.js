const config = require('config');
const fastify = require('fastify');
const tailorFactory = require('./tailor/factory');
const serveStatic = require('./serveStatic');
const errorHandlingService = require('./errorHandler/factory');
const i18n = require('./i18n');
const UrlProcessor = require('../common/UrlProcessor');

/**
 * @param {Registry} registryService
 */
module.exports = (registryService) => {
    const app = fastify(Object.assign({
        trustProxy: false, //TODO: should be configurable via Registry
    }, require('./logger/fastify')));


    app.addHook('onRequest', async (req, reply) => {
        req.raw.ilcState = {};
        const registryConfig = await registryService.getConfig();
        const i18nOnRequest = i18n.onRequestFactory(registryConfig.data.settings.i18n);

        await i18nOnRequest(req, reply);
    });

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
        res.status(200).send(data.data.content);
    });

    // Route to test 500 page appearance
    app.get('/_ilc/500', async () => { throw new Error('500 page test error') });

    app.all('*', async (req, res) => {
        const url = req.raw.url;
        const registryConfig = await registryService.getConfig();
        const processedUrl = new UrlProcessor(registryConfig.data.settings.trailingSlash).process(url);

        if (processedUrl !== url) {
            res.redirect(processedUrl);
            return;
        }

        req.headers['x-request-host'] = req.hostname;
        req.headers['x-request-uri'] = url;

        res.sent = true; // claim full responsibility of the low-level request and response, see https://www.fastify.io/docs/v2.12.x/Reply/#sent
        tailor.requestHandler(req.raw, res.res);
    });

    app.setErrorHandler(errorHandlingService.handleError);

    return app;
};
