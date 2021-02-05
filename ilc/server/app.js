const config = require('config');
const fastify = require('fastify');
const tailorFactory = require('./tailor/factory');
const serveStatic = require('./serveStatic');
const errorHandlingService = require('./errorHandler/factory');
const i18n = require('./i18n');
const GuardManager = require('./GuardManager');
const UrlProcessor = require('../common/UrlProcessor');
const logger = require('./logger');
const ServerRouter = require('./tailor/server-router');
const mergeConfigs = require('./tailor/merge-configs');
const parseOverrideConfig = require('./tailor/parse-override-config');

/**
 * @param {Registry} registryService
 */
module.exports = (registryService, pluginManager) => {
    const app = fastify(Object.assign({
        trustProxy: false, //TODO: should be configurable via Registry
    }, require('./logger/fastify')));

    const i18nParamsDetectionPlugin = pluginManager.getI18nParamsDetectionPlugin();
    const guardManager = new GuardManager(pluginManager);

    app.addHook('onRequest', async (req, reply) => {
        req.raw.ilcState = {};
        const registryConfig = (await registryService.getConfig()).data;
        const i18nOnRequest = i18n.onRequestFactory(registryConfig.settings.i18n, i18nParamsDetectionPlugin);

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
        let registryConfig = (await registryService.getConfig()).data;

        const url = req.raw.url;
        const urlProcessor = new UrlProcessor(registryConfig.settings.trailingSlash);
        const processedUrl = urlProcessor.process(url);

        if (processedUrl !== url) {
            res.redirect(processedUrl);
            return;
        }

        req.headers['x-request-host'] = req.hostname;
        req.headers['x-request-uri'] = url;

        //TODO: move overrideConfigTrustedOrigins to Registry config
        registryConfig = mergeConfigs(registryConfig, parseOverrideConfig(req.headers.cookie, config.get('overrideConfigTrustedOrigins')));

        const unlocalizedUrl = i18n.unlocalizeUrl(registryConfig.settings.i18n, url);
        req.raw.registryConfig = registryConfig;
        req.raw.router = new ServerRouter(logger, req.raw, unlocalizedUrl);

        const redirectTo = await guardManager.redirectTo(req.raw);
        if (redirectTo) {
            res.redirect(urlProcessor.process(i18n.localizeUrl(registryConfig.settings.i18n, redirectTo, {
                locale: req.raw.ilcState.locale,
            })));
            return;
        }

        res.sent = true; // claim full responsibility of the low-level request and response, see https://www.fastify.io/docs/v2.12.x/Reply/#sent
        tailor.requestHandler(req.raw, res.res);
    });

    app.setErrorHandler(errorHandlingService.handleError);

    return app;
};
