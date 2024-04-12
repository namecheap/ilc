import { AsyncResource } from 'node:async_hooks';
import { renderTemplateHandlerFactory } from './routes/renderTemplateHandlerFactory';
import { wildcardRequestHandlerFactory } from './routes/wildcardRequestHandlerFactory';

const config = require('config');
const fastify = require('fastify');
const serveStatic = require('./serveStatic');
const errorHandlingService = require('./errorHandler/factory');
const i18n = require('./i18n');
const Application = require('./application/application');
const reportingPluginManager = require('./plugins/reportingPlugin');
const AccessLogger = require('./logger/accessLogger');
const { isStaticFile, isHealthCheck } = require('./utils/utils');

/**
 * @param {Registry} registryService
 */
module.exports = (registryService, pluginManager, context) => {
    const reportingPlugin = reportingPluginManager.getInstance();

    const appConfig = Application.getConfig(reportingPlugin);
    const logger = reportingPluginManager.getLogger();
    const accessLogger = new AccessLogger(config, logger);
    const app = fastify(appConfig);

    const asyncResourceSymbol = Symbol('asyncResource');

    app.addHook('onRequest', (req, reply, done) => {
        context.run({ request: req, requestId: reportingPluginManager.getRequestId() ?? request.id }, async () => {
            try {
                const asyncResource = new AsyncResource('fastify-request-context');
                req[asyncResourceSymbol] = asyncResource;
                const doneWithContext = () => asyncResource.runInAsyncScope(done, req.raw);

                const { url, method } = req.raw;
                accessLogger.logRequest();

                if (!['GET', 'OPTIONS', 'HEAD'].includes(method)) {
                    logger.warn(`Request method ${method} is not allowed for url ${url}`);
                    reply.code(405).send({ message: 'Method Not Allowed' });
                    return;
                }

                req.raw.ilcState = {};

                if (isStaticFile(url) || isHealthCheck(url) || ['OPTIONS', 'HEAD'].includes(method)) {
                    return doneWithContext();
                }

                const domainName = req.hostname;

                const registryConfig = await registryService.getConfig({ filter: { domain: domainName } });
                const i18nOnRequest = i18n.onRequestFactory(
                    registryConfig.settings.i18n,
                    pluginManager.getI18nParamsDetectionPlugin(),
                );

                await i18nOnRequest(req, reply);

                doneWithContext();
            } catch (error) {
                errorHandlingService.handleError(error, req, reply);
            }
        });
    });

    /**
     * Solves issue when async context is lost in webpack-dev-middleware during initial bundle build
     * Took from here
     * https://github.com/fastify/fastify-request-context/blob/master/index.js#L46
     * TODO: after migration to fastify v4 makes sense to use above plugin instead of custom impl
     */
    app.addHook('preValidation', (req, res, done) => {
        const asyncResource = req[asyncResourceSymbol];
        asyncResource.runInAsyncScope(done, req.raw);
    });

    app.addHook('onResponse', (req, reply, done) => {
        const asyncResource = req[asyncResourceSymbol];
        asyncResource.runInAsyncScope(() => {
            try {
                accessLogger.logResponse({
                    statusCode: reply.statusCode,
                    responseTime: reply.getResponseTime(),
                });
                done();
            } catch (error) {
                errorHandlingService.noticeError(error);
            }
        }, req.raw);
    });

    if (config.get('cdnUrl') === null) {
        app.use(config.get('static.internalUrl'), serveStatic(config.get('productionMode')));
    }

    app.register(require('./ping'));

    app.get('/_ilc/api/v1/registry/template/:templateName', renderTemplateHandlerFactory(registryService));

    // Route to test 500 page appearance
    app.get('/_ilc/500', async () => {
        throw new Error('500 page test error');
    });

    app.all('*', wildcardRequestHandlerFactory(logger, registryService, pluginManager));

    app.setErrorHandler(errorHandlingService.handleError);

    return app;
};
