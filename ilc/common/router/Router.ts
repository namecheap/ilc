import deepmerge from 'deepmerge';
import { TransformedRegistryConfig, TransformedRoute, TransformedSpecialRoute } from '../../server/types/Registry';
import { RouterMatch, Slot, SlotValue } from '../../common/types/Router';
import { getSlotEntries } from '../utils';
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
            throw new NoBaseTemplateMatchError({ data: { route: route } });
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

    /**
     * A later route replaces the slot of an earlier `next` route; an app present on both sides keeps
     * the earlier props merged with the later ones. With several apps per slot the same rule applies
     * per app: the later list wins, and each of its apps merges the props of its namesake, if any.
     */
    private mergeSlots(a: Record<string, SlotValue>, b: Record<string, SlotValue>) {
        const res: Record<string, SlotValue> = { ...a, ...b };

        for (let slotName in res) {
            if (!res.hasOwnProperty(slotName)) {
                continue;
            }

            if (!a[slotName] || !b[slotName]) {
                continue;
            }

            const earlier = getSlotEntries(a[slotName]);
            const later = getSlotEntries(b[slotName]);

            const merged = later.map((entry) => {
                const namesake = earlier.find((candidate) => candidate.appName === entry.appName);

                return namesake ? deepmerge(namesake, entry) : entry;
            });

            res[slotName] = Array.isArray(b[slotName]) ? merged : merged[0];
        }

        return res;
    }
}
