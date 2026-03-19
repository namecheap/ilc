import type Newrelic from 'newrelic';
import type { Registry, Template } from '../types/Registry';
import type { PatchedHttpRequest } from '../types/PatchedHttpRequest';
import { buildForwardedHeaders } from '../utils/helpers';

interface ConfigsInjector {
    inject(request: PatchedHttpRequest, template: Template, route: unknown): string;
}

export const TEMPLATE_ERROR = 0;
export const TEMPLATE_NOT_FOUND = 1;

export function fetchTemplate(configsInjector: ConfigsInjector, newrelic: typeof Newrelic, registryService: Registry) {
    return async (request: PatchedHttpRequest, parseTemplate: (base: string, child: unknown) => unknown) => {
        const router = request.router!;
        const childTemplate = router.getFragmentsTpl();
        const currRoute = router.getRoute();

        const forDomain = request.headers['x-request-host'] as string | undefined;
        const routeKey = currRoute.route || `special:${currRoute.specialRole}`;

        const forwardedHeaders = buildForwardedHeaders(
            request.registryConfig?.settings?.templateProxyHeaders,
            request.headers,
        );

        const template = await registryService.getTemplate(currRoute.template, {
            forDomain,
            routeKey,
            forwardedHeaders,
        });
        if (template === undefined) {
            throw new Error("Can't match route base template to config map");
        }

        const routeName = routeKey.replace(/^\//, '');
        if (routeName) {
            newrelic.setTransactionName(routeName);
        }

        const baseTemplate = configsInjector.inject(request, template.data, currRoute);

        return parseTemplate(baseTemplate, childTemplate);
    };
}
