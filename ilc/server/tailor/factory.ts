import newrelic from 'newrelic';

import { Tailor, type TailorOptions } from './tailorx';
import { fetchTemplate } from './fetch-template';
import { filterHeaders } from './filter-headers';
import errorHandlerSetup from './error-handler';
import fragmentHooks from './fragment-hooks';
import { ConfigsInjector } from './configs-injector';
import processFragmentResponse from './process-fragment-response';
import { requestFragmentFactory } from './request-fragment';
import type { ServerRouter } from './server-router';
import type { Registry } from '../types/Registry';

type Logger = Pick<Console, 'debug' | 'warn'>;

/**
 * The error-handling service is injected by app.js and typed where it is defined; this module
 * only passes it through, so it takes it as opaque.
 */
export function tailorFactory(
    registryService: Registry,
    errorHandlingService: unknown,
    cdnUrl: string | null,
    nrCustomClientJsWrapper: string | null = null,
    nrAutomaticallyInjectClientScript = true,
    logger: Logger,
    maxFragmentRequestSize?: unknown,
) {
    const configsInjector = new ConfigsInjector(
        newrelic,
        cdnUrl,
        nrCustomClientJsWrapper,
        nrAutomaticallyInjectClientScript,
    );

    const tailorOptions: TailorOptions = {
        fetchContext: async function (request: { router: ServerRouter }) {
            return request.router.getFragmentsContext();
        },
        fetchTemplate: fetchTemplate(configsInjector, newrelic, registryService),
        requestFragment: requestFragmentFactory(filterHeaders, processFragmentResponse, logger, {
            maxRequestSize: maxFragmentRequestSize,
        }),
        processFragmentResponse,
        filterHeaders,
        fragmentHooks: {
            insertStart: fragmentHooks.insertStart.bind(null, logger),
            insertEnd: fragmentHooks.insertEnd,
        },
        botsGuardEnabled: true,
        getAssetsToPreload: configsInjector.getAssetsToPreload,
        filterResponseHeaders: (attributes: unknown, headers: Record<string, unknown>) =>
            'set-cookie' in headers ? { 'set-cookie': headers['set-cookie'] } : {},
        baseTemplatesCacheSize: 1,
        shouldSetPrimaryFragmentAssetsToPreload: false,
    };

    const tailor = new Tailor(tailorOptions);

    errorHandlerSetup(tailor, errorHandlingService);

    return tailor;
}
