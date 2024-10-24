import config from 'config';
import newrelic from 'newrelic';

import { SlotCollection } from '../../common/Slot/SlotCollection';
import UrlProcessor from '../../common/UrlProcessor';
import errorHandlingService from '../errorHandler/factory';
import GuardManager from '../GuardManager';
import i18n from '../i18n';
import CspBuilderService from '../services/CspBuilderService';
import tailorFactory from '../tailor/factory';
import mergeConfigs from '../tailor/merge-configs';
import parseOverrideConfig from '../tailor/parse-override-config';
import ServerRouter from '../tailor/server-router';
import { PatchedHttpRequest } from '../types/PatchedHttpRequest';
import { Registry, TransformedRegistryConfig } from '../types/Registry';

import type { RequestHandler } from 'fastify';
import type { Logger, PluginManager } from 'ilc-plugins-sdk';

export function wildcardRequestHandlerFactory(
    logger: Logger,
    registryService: Registry,
    pluginManager: PluginManager,
): RequestHandler<PatchedHttpRequest> {
    const guardManager = new GuardManager(pluginManager);
    const autoInjectNrMonitoringConfig = config.get('newrelic.automaticallyInjectBrowserMonitoring');
    const autoInjectNrMonitoring =
        typeof autoInjectNrMonitoringConfig === 'boolean'
            ? autoInjectNrMonitoringConfig
            : autoInjectNrMonitoringConfig !== 'false';

    const tailor = tailorFactory(
        registryService,
        config.get('cdnUrl'),
        config.get('newrelic.customClientJsWrapper'),
        autoInjectNrMonitoring,
        logger,
    );

    return async function wildcardRequestHandler(req, reply) {
        const currentDomain = req.hostname;
        const registryConfig = await registryService.getConfig({ filter: { domain: currentDomain } });
        const url = req.raw.url;
        const urlProcessor = new UrlProcessor(registryConfig.settings.trailingSlash);
        const processedUrl = urlProcessor.process(url);

        if (processedUrl !== url) {
            reply.redirect(
                registryConfig.settings.trailingSlash === UrlProcessor.routerHasTo.redirectToTrailingSlash ? 301 : 302,
                processedUrl,
            );
            return;
        }

        req.headers['x-request-host'] = req.hostname;
        req.headers['x-request-uri'] = url;

        const overrideConfigs = parseOverrideConfig(
            req.headers.cookie,
            registryConfig.settings.overrideConfigTrustedOrigins,
            logger,
        );
        // Excluding LDE related transactions from NewRelic
        if (overrideConfigs !== null) {
            req.raw.ldeRelated = true;
            newrelic.getTransaction().ignore();
        }

        const finalRegistryConfig: TransformedRegistryConfig = mergeConfigs(registryConfig, overrideConfigs);
        req.raw.registryConfig = finalRegistryConfig;

        const unlocalizedUrl = i18n.unlocalizeUrl(finalRegistryConfig.settings.i18n, url);
        req.raw.router = new ServerRouter(req.log, req.raw, unlocalizedUrl);

        const redirectTo = await guardManager.redirectTo(req);

        if (redirectTo) {
            reply.redirect(
                urlProcessor.process(
                    i18n.localizeUrl(finalRegistryConfig.settings.i18n, redirectTo, {
                        locale: req.raw.ilcState?.locale,
                    }),
                ),
            );
            return;
        }

        const route = req.raw.router.getRoute();

        const csp = new CspBuilderService(
            finalRegistryConfig.settings.cspConfig,
            !!finalRegistryConfig.settings.cspEnableStrict,
            !!req.raw.ldeRelated,
            finalRegistryConfig.settings.cspTrustedLocalHosts,
        );

        try {
            reply.res = csp.setHeader(reply.res);
        } catch (error) {
            errorHandlingService.noticeError(error, {
                message: 'CSP object processing error',
            });
        }

        const isRouteWithoutSlots = !Object.keys(route.slots).length;
        if (isRouteWithoutSlots) {
            const locale = req.raw.ilcState?.locale;
            const { data } = await registryService.getTemplate(route.template, { locale });

            reply.header('Content-Type', 'text/html');
            reply.status(200).send(data.content);
            return;
        }

        const slotCollection = new SlotCollection(route.slots, finalRegistryConfig);
        slotCollection.isValid();

        reply.sent = true; // claim full responsibility of the low-level request and response, see https://www.fastify.io/docs/v2.12.x/Reply/#sent
        tailor.requestHandler(req.raw, reply.res);
    };
}
