import _ from 'lodash';
import newrelic from 'newrelic';
import type { Logger } from 'ilc-plugins-sdk';
import Tailor from '@namecheap/tailorx';

import { fetchTemplate } from './fetch-template';
import { filterHeaders } from './filter-headers';
import errorHandlerSetup from './error-handler';
import * as fragmentHooks from './fragment-hooks';
import { ConfigsInjector } from './configs-injector';
import processFragmentResponse from './process-fragment-response';
import requestFragmentFactory from './request-fragment';
import { wrapRequestFragmentWithCache } from './request-fragment-cache';
import type { PatchedHttpRequest } from '../types/PatchedHttpRequest';
import type { Registry } from '../types/Registry';
import type { ErrorHandler } from '../types/ErrorHandler';

export default function tailorFactory(
    registryService: Registry,
    errorHandlingService: ErrorHandler,
    cdnUrl: string,
    nrCustomClientJsWrapper: string | null = null,
    nrAutomaticallyInjectClientScript = true,
    logger: Logger,
) {
    const configsInjector = new ConfigsInjector(
        newrelic,
        cdnUrl,
        nrCustomClientJsWrapper,
        nrAutomaticallyInjectClientScript,
    );

    const tailorOptions = {
        fetchContext: async function (request: PatchedHttpRequest) {
            return request.router!.getFragmentsContext();
        },
        fetchTemplate: fetchTemplate(configsInjector, newrelic, registryService),
        requestFragment: wrapRequestFragmentWithCache(
            requestFragmentFactory(filterHeaders, processFragmentResponse, logger),
            {
                logger,
                onCacheEvent: (event, { appId, source, reason }) => {
                    // at most one qualifier is ever set: `source` on 'error', `reason` on 'refuse'
                    const qualifier = source ?? reason;
                    const metricName = qualifier
                        ? `FragmentCache/${appId}/${event}/${qualifier}`
                        : `FragmentCache/${appId}/${event}`;
                    newrelic.incrementMetric(metricName);
                },
            },
        ),
        processFragmentResponse,
        systemScripts: '',
        filterHeaders,
        fragmentHooks: {
            insertStart: fragmentHooks.insertStart.bind(null, logger),
            insertEnd: fragmentHooks.insertEnd,
        },
        botsGuardEnabled: true,
        getAssetsToPreload: configsInjector.getAssetsToPreload,
        filterResponseHeaders: (_attributes: unknown, headers: Record<string, unknown>) =>
            _.pick(headers, ['set-cookie']),
        baseTemplatesCacheSize: 1,
        shouldSetPrimaryFragmentAssetsToPreload: false,
    };

    // @namecheap/tailorx's bundled .d.ts is stale (see index.js) and covers fewer options than
    // the runtime reads; this assertion bridges to that outdated third-party declaration.
    const tailor = new Tailor(tailorOptions as unknown as ConstructorParameters<typeof Tailor>[0]);

    errorHandlerSetup(tailor, errorHandlingService);

    return tailor;
}
