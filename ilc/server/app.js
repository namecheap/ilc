const newrelic = require('newrelic');
const _ = require('lodash');
const config = require('config');
const fastify = require('fastify');
const tailorFactory = require('./tailor/factory');
const serveStatic = require('./serveStatic');
const errorHandlingService = require('./errorHandler/factory');
const i18n = require('./i18n');
const GuardManager = require('./GuardManager');
const UrlProcessor = require('../common/UrlProcessor');
const ServerRouter = require('./tailor/server-router');
const mergeConfigs = require('./tailor/merge-configs');
const parseOverrideConfig = require('./tailor/parse-override-config');

/**
 * @param {Registry} registryService
 */
module.exports = (registryService, pluginManager) => {
    const guardManager = new GuardManager(pluginManager);

    const shouldUrlBeLogged = url => {
        const ignoredUrls = config.get('logger.accessLog.ignoreUrls').split(',');

        return !ignoredUrls.includes(url);
    };

    const app = fastify(Object.assign(
        {
            trustProxy: false, // TODO: should be configurable via Registry,
            disableRequestLogging: true,
        },
        _.omit(_.pick(pluginManager.getReportingPlugin(), ['logger', 'requestIdLogLabel', 'genReqId']), _.isEmpty),
    ));

    app.addHook('onRequest', async (req, reply) => {
        if (shouldUrlBeLogged(req.raw.url)) {
            req.log.info({ url: req.raw.url, id: req.id, domain: req.hostname }, 'received request');
        }

        req.raw.ilcState = {};
        const registryConfig = (await registryService.getConfig()).data;
        const i18nOnRequest = i18n.onRequestFactory(registryConfig.settings.i18n, pluginManager.getI18nParamsDetectionPlugin());

        await i18nOnRequest(req, reply);
    });

    app.addHook('onResponse', (req, reply, done) => {
        if (shouldUrlBeLogged(req.raw.url)) {
            req.log.info(
                {
                    url: req.raw.url,
                    statusCode: reply.statusCode,
                    domain: req.hostname,
                    responseTime: reply.getResponseTime(),
                },
                'request completed'
            );
        }

        done();
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
        const currentDomain = req.hostname;
        const locale = req.raw.ilcState.locale;
        const data = await registryService.getTemplate(req.params.templateName, currentDomain, locale);
        res.status(200).send(data.data.content);
    });

    // Route to test 500 page appearance
    app.get('/_ilc/500', async () => { throw new Error('500 page test error') });

    // Route to test page for unsupported browser
    app.get('/_ilc/unsupported_browser', async (req, res) => {
        const locale = req.raw.ilcState.locale;
        let { data } = await registryService.getTemplate('unsupported_browser', null, locale);

        res.header('Content-Type', 'text/html');
        res.status(200).send(data.content);
    });

    app.all('*', async (req, res) => {
        const currentDomain = req.hostname;
        let registryConfig = (await registryService.getConfig({ filter: { domain: currentDomain } })).data;

        const url = req.raw.url;
        const urlProcessor = new UrlProcessor(registryConfig.settings.trailingSlash);
        const processedUrl = urlProcessor.process(url);
        if (processedUrl !== url) {
            res.redirect(processedUrl);
            return;
        }

        req.headers['x-request-host'] = req.hostname;
        req.headers['x-request-uri'] = url;

        const overrideConfigs = parseOverrideConfig(req.headers.cookie, registryConfig.settings.overrideConfigTrustedOrigins);
        // Excluding LDE related transactions from NewRelic
        if (overrideConfigs !== null) {
            req.raw.ldeRelated = true;
            newrelic.getTransaction().ignore();
        }
        registryConfig = mergeConfigs(registryConfig, overrideConfigs);

        const unlocalizedUrl = i18n.unlocalizeUrl(registryConfig.settings.i18n, url);
        req.raw.registryConfig = registryConfig;
        req.raw.router = new ServerRouter(req.log, req.raw, unlocalizedUrl);

        const redirectTo = await guardManager.redirectTo(req);

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
