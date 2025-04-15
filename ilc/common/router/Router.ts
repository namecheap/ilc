import deepmerge from 'deepmerge';
import { TransformedRegistryConfig, TransformedRoute, TransformedSpecialRoute } from '../../server/types/Registry';
import { RouterMatch, Slot } from '../../common/types/Router';
import { NoBaseTemplateMatchError, NoRouteMatchError } from './errors';

type CompiledRoute = TransformedRoute & {
    routeExp: RegExp;
};

export class Router {
    private readonly compiledRoutes: CompiledRoute[];
    private readonly specialRoutes: Record<number, TransformedSpecialRoute>;

    constructor(registryConfig: TransformedRegistryConfig) {
        const { routes, specialRoutes } = registryConfig;

        this.compiledRoutes = this.compile(routes);
        this.specialRoutes = specialRoutes || {};
    }

    match(reqUrl: string): RouterMatch {
        const path = new URL('http://hack' + reqUrl).pathname;

        const result: RouterMatch = {
            basePath: '/',
            reqUrl,
            specialRole: null,
            slots: {},
            meta: {},
            template: '',
        };

        for (const route of this.compiledRoutes) {
            const { next, routeExp, slots, meta, template, route: routePath } = route;

            const match = path.match(routeExp);

            if (match === null) {
                continue;
            }

            Object.assign(result, {
                template: template ?? result.template,
                route: routePath,
                specialRole: null,
                meta: deepmerge(result.meta, meta ?? {}),
                slots: this.mergeSlots(result.slots, slots ?? {}),
            });

            if (next !== true) {
                result.basePath = match[1];
                result.reqUrl = reqUrl;

                this.validateResultingRoute(result);

                return result;
            }
        }

        return this.matchSpecial(reqUrl, 404);
    }

    matchSpecial(reqUrl: string, specialRouteId: number): RouterMatch {
        const specialRoute = this.specialRoutes[specialRouteId];

        if (specialRoute === undefined) {
            throw new NoRouteMatchError();
        }

        const route = {
            basePath: '/',
            reqUrl,
            specialRole: specialRouteId,
            slots: specialRoute.slots,
            template: specialRoute.template,
            meta: specialRoute.meta,
        };

        this.validateResultingRoute(route);

        return route;
    }

    validateResultingRoute(route: RouterMatch) {
        if (!route.template) {
            throw new NoBaseTemplateMatchError();
        }
    }

    private compile(routes: TransformedRoute[]) {
        return routes.map((v) => {
            const route = this.escapeStringRegexp(v.route);

            let routeExp;

            if (v.route === '*') {
                routeExp = new RegExp(`(\/).*`);
            } else if (v.route === '/') {
                routeExp = new RegExp(`^(/)$`);
            } else if (v.route.match(/\/\*$/) !== null) {
                const basePath = route.substring(0, route.length - 3);

                routeExp = new RegExp(`^(${basePath})(?:$|/.*)`);
            } else {
                let basePath = route;

                if (v.route[v.route.length - 1] === '/') {
                    basePath = route.substring(0, route.length - 1);
                }

                routeExp = new RegExp(`^(${basePath})/?$`);
            }

            return {
                ...v,
                routeExp,
            };
        });
    }

    private escapeStringRegexp(str: string): string {
        return str.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&');
    }

    private mergeSlots(a: Record<string, Slot>, b: Record<string, Slot>) {
        const res = { ...a, ...b };

        for (let slotName in res) {
            if (!res.hasOwnProperty(slotName)) {
                continue;
            }

            if (a[slotName] && b[slotName] && a[slotName].appName === b[slotName].appName) {
                res[slotName] = deepmerge(a[slotName], b[slotName]);
            }
        }

        return res;
    }
}
