const config = require('config');
const fastify = require('fastify');
const tailorFactory = require('./tailor/factory');
const serveStatic = require('./serveStatic');
const registryService = require('./registry/factory');
const errorHandlingService = require('./errorHandler/factory');

module.exports = () => {
    const app = fastify({
        logger: require('./fastifyLoggerConf'),
    });
    const tailor = tailorFactory(config.get('cdnUrl'), config.get('newrelic.customClientJsWrapper'));

    app.register(require('./ping'));

    if (config.get('cdnUrl') === null) {
        app.use('/_ilc/', serveStatic(config.get('productionMode')));
    }

    app.get('/_ilc/api/v1/registry/template/:templateName', async (req, res) => {
        const data = await registryService.getTemplate(req.params.templateName);
        return res.status(200).send(data.data.content);
    });

    // Route to test 500 page appearance
    app.get('/_ilc/500', async () => { throw new Error('500 page test error') });

    app.all('*', (req, res) => {
        req.headers['x-request-uri'] = req.raw.url; //TODO: to be removed & replaced with routerProps
        req.raw.ilcState = {};
        tailor.requestHandler(req.raw, res.res);
    });

    app.setErrorHandler(errorHandlingService.handleError);

    return app;
};
