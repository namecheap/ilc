const deepmerge = require('deepmerge');

const errors = require('./errors');

module.exports = class Router {
    errors = errors;

    #compiledRoutes = [];
    #specialRoutes = {};

    constructor(registryConfig) {
        const {
            routes,
            specialRoutes,
        } = registryConfig;

        this.#compiledRoutes = this.#compiler(routes);
        this.#specialRoutes = specialRoutes || {};
    }

    match(reqUrl) {
        const path = new URL('http://hack' + reqUrl).pathname;

        let res = {
            basePath: '/',
            reqUrl,
        };

        for (let route of this.#compiledRoutes) {
            const {
                next,
                routeExp,
                ...routeProps
            } = route;

            const match = path.match(routeExp);

            if (match === null) {
                continue;
            }

            res = deepmerge(res, {
                specialRole: null,
                ...routeProps,
            });

            if (next !== true) {
                res.basePath = match[1];
                res.reqUrl = reqUrl;

                this.#validateResultingRoute(res);

                return res;
            }
        }

        return this.matchSpecial(reqUrl, 404);
    }

    matchSpecial(reqUrl, specialRouteId) {
        specialRouteId = parseInt(specialRouteId);
        const specialRoute = this.#specialRoutes[specialRouteId];

        if (specialRoute === undefined) {
            throw new this.errors.NoRouteMatchError();
        }

        let res = {
            basePath: '/',
            reqUrl,
        };

        res = deepmerge(res, {
            specialRole: specialRouteId,
            route: specialRoute.route,
            routeId: specialRoute.routeId,
            slots: specialRoute.slots,
            template: specialRoute.template,
        });


        this.#validateResultingRoute(res);

        return res;
    }

    #validateResultingRoute = (route) => {
        if (!route.template) {
            throw new this.errors.NoBaseTemplateMatchError();
        }
    };

    #compiler = (routes) => {
        return routes.map(v => {
            const route = this.#escapeStringRegexp(v.route);

            let routeExp;

            if (v.route === '*') {
                routeExp = new RegExp(`(.*)`);
            } else if (v.route === '/') {
                routeExp = new RegExp(`^(/)$`);
            } else if (v.route.match(/\/\*$/) !== null) {
                const basePath = route.substring(0, route.length - 3);

                routeExp = new RegExp(`^(${basePath})/?.*`);
            } else {
                let basePath = route;

                if (v.route[v.route.length - 1] === '/') {
                    basePath = route.substring(0, route.length - 1);
                };

                routeExp = new RegExp(`^(${basePath})/?$`);
            }

            return {
                ...v,
                routeExp,
            };
        });
    };

    #escapeStringRegexp = (str) => {
        return str.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&');
    };
};
