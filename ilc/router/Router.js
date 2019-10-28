const _defaultsDeep = require('lodash/defaultsDeep');
const _omit = require('lodash/omit');

const errors = require('./errors');

module.exports = class Router {
    errors = errors;

    #compiledRoutes = [];
    #specialRoutes = {};

    constructor({routes, specialRoutes}) {
        this.#compiledRoutes =  this.__compiler(routes);
        this.#specialRoutes = specialRoutes;
    }

    match(reqUrl) {
        const path = new URL('http://hack' + reqUrl).pathname;

        let res = {};

        for (let route of this.#compiledRoutes) {
            const match = path.match(route.routeExp);
            if (match === null) {
                continue;
            }

            res = _defaultsDeep({}, _omit(route, ['route', 'next', 'routeExp']), res);

            if (route.next !== true) {
                if (res.template === undefined) {
                    throw new Error('Can\'t determine base template for passed route');
                }

                res.basePath = match[1];
                res.reqUrl = reqUrl;

                return res;
            }
        }

        if (this.#specialRoutes[404] === undefined) {
            throw new errors.NoRouteMatchError();
        }

        return _defaultsDeep({}, this.#specialRoutes[404]);
    }

    __compiler(routes) {
        return routes.map(v => {
            const route = this.#escapeStringRegexp(v.route);

            if (v.route === '*') {
                v.routeExp = new RegExp(`(.*)`);
            } else if (v.route.match(/\/\*$/) !== null) {
                const basePath = route.substring(0, route.length - 3);

                v.routeExp = new RegExp(`^(${basePath})/?.*`);
            } else {
                v.routeExp = new RegExp(`^(${route})$`);
            }

            return v;
        });
    }

    #escapeStringRegexp = (str) => {
        return str.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&');
    }
};