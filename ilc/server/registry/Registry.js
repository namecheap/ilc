const axios = require('axios');
const urljoin = require('url-join');
const { cloneDeep } = require('../../common/utils');

const extendError = require('@namecheap/error-extender');

const errors = {};
errors.RegistryError = extendError('RegistryError');

module.exports = class Registry {
    #address;
    #logger;
    #cacheHeated = {
        config: false,
        template: false,
        routerDomains: false,
    };

    /**
     * @param {string} address - registry address. Ex: http://registry:8080/
     * @param {Function} wrapFetchWithCache - cache provider
     * @param {Object} logger - log provider that implements "console" interface
     */
    constructor(
        address,
        wrapFetchWithCache,
        logger
    ) {
        this.#address = address;
        this.#logger = logger;

        const getConfigMemo = wrapFetchWithCache(this.#getConfig, {
            cacheForSeconds: 5,
            name: 'registry_getConfig',
        });

        this.getConfig = async (options) => {
            const res = await getConfigMemo();
            res.data = this.#filterConfig(res.data, options?.filter);
            return res;
        };

        this.getRouterDomains = wrapFetchWithCache(this.#getRouterDomains, {
            cacheForSeconds: 30,
            name: 'registry_routerDomains',
        });

        const getTemplateMemo = wrapFetchWithCache(this.#getTemplate, {
            cacheForSeconds: 30,
            name: 'registry_getTemplate',
        });

        this.getTemplate = async (templateName, { locale, forDomain } = {}) => {
            if (templateName === '500' && forDomain) {
                const routerDomains = await this.getRouterDomains();
                const redefined500 = routerDomains.data.find(item => item.domainName === forDomain)?.template500;
                templateName = redefined500 || templateName;
            }

            return await getTemplateMemo(templateName, locale);
        };
    }

    async preheat() {
        if (this.#cacheHeated.template && this.#cacheHeated.config && this.#cacheHeated.routerDomains) {
            return;
        }

        this.#logger.info('Registry is preheating...');

        await Promise.all([
            this.getConfig(),
            this.getTemplate('500'),
            this.getRouterDomains(),
        ]);

        this.#logger.info('Registry preheated successfully!');
    }

    #getConfig = async () => {
        this.#logger.debug('Calling get config registry endpoint...');

        const tplUrl = urljoin(this.#address, 'api/v1/config');
        let res;
        try {
            res = await axios.get(tplUrl, { responseType: 'json' });
        } catch (e) {
            throw new errors.RegistryError({
                message: `Error while requesting config from registry`,
                cause: e,
                data: {
                    requestedUrl: tplUrl
                }
            });
        }

        this.#cacheHeated.config = true;

        return res.data;
    };

    #getTemplate = async (templateName, locale) => {
        this.#logger.debug('Calling get template registry endpoint...');
        const queryString = locale ? `?locale=${locale}` : '';
        const tplUrl = urljoin(this.#address, 'api/v1/template', templateName, 'rendered') + queryString;
        let res;
        try {
            res = await axios.get(tplUrl, { responseType: 'json' });
        } catch (e) {
            throw new errors.RegistryError({
                message: `Error while requesting rendered template "${templateName}" from registry`,
                cause: e,
                data: {
                    requestedUrl: tplUrl
                }
            });
        }

        let templateStr = res.data.content;

        let lastMatchOffset = templateStr.lastIndexOf('<ilc-slot');
        templateStr = templateStr.replace(/<ilc-slot\s+id="(.+)"\s*\/?>/gm, function (match, id, offset) {
            return `<!-- Region "${id}" START -->\n` +
                // We change simplified slot definition onto TailorX required one
                `<div id="${id}"><slot name="${id}"></slot></div>\n` +
                // Used for AsyncBootUp functionality at client side
                `<script>window.ilcApps.push('${id}');${lastMatchOffset === offset ? 'window.ilcApps.push(Infinity);' : ''}</script>\n` +
                `<!-- Region "${id}" END -->`;
        });

        this.#cacheHeated.template = true;

        return {...res.data, content: templateStr};
    };

    #getRouterDomains = async () => {
        this.#logger.debug('Calling get routerDomains registry endpoint...');

        const url = urljoin(this.#address, 'api/v1/router_domains');
        let res;
        try {
            res = await axios.get(url, { responseType: 'json' });
        } catch (e) {
            throw new errors.RegistryError({
                message: `Error while requesting routerDomains from registry`,
                cause: e,
                data: {
                    requestedUrl: url
                }
            });
        }

        this.#cacheHeated.routerDomains = true;
        return res.data;
    };

    #filterConfig = (config, filter) => {
        if (!filter || !Object.keys(filter).length) {
            return config;
        }

        const clonedConfig = cloneDeep(config);

        if (filter.domain) {
            clonedConfig.routes = this.#filterRoutesByDomain(clonedConfig.routes, filter.domain);
        }

        clonedConfig.specialRoutes = this.#filterSpecialRoutesByDomain(clonedConfig.specialRoutes, filter.domain);

        if (filter.domain) {
            const routesRelatedToDomain = [ ...clonedConfig.routes, ...Object.values(clonedConfig.specialRoutes)];
            const allRoutes = [...config.routes, ...Object.values(config.specialRoutes)];
            const allApps = config.apps;

            clonedConfig.apps = this.#getAppsByDomain(routesRelatedToDomain, allRoutes, allApps, filter.domain);
        }

        return clonedConfig;
    };

    #filterRoutesByDomain = (routes, domain) => {
        const routesForCurrentDomain = [];
        const routesWithoutDomain = [];

        routes.forEach((route) => {
            const { domain: routeDomain, ...routeData } = route; // remove property "domain" since it's unnecessary

            if (routeDomain === undefined) {
                routesWithoutDomain.push(routeData);
            } else if (routeDomain === domain) {
                routesForCurrentDomain.push(routeData);
            }
        });

        return routesForCurrentDomain.length ? routesForCurrentDomain : routesWithoutDomain;
    };

    #filterSpecialRoutesByDomain = (specialRoutes, domain) => {
        const specialRoutesWithoutDomain = {};
        const specialRoutesForCurrentDomain = {};

        specialRoutes.forEach((route) => {
            const { domain: routeDomain, specialRole, ...routeData } = route; // remove properties "domain" and "specialRole" since it's unnecessary

            if (routeDomain === undefined) {
                specialRoutesWithoutDomain[specialRole] = routeData;
            } else if (domain && routeDomain === domain) {
                specialRoutesForCurrentDomain[specialRole] = routeData;
            }
        });

        return Object.keys(specialRoutesForCurrentDomain).length ? specialRoutesForCurrentDomain : specialRoutesWithoutDomain;
    };

    #getAppsByDomain = (routesRelatedToDomain, allRoutes, allApps, domain) => {
        // apps which are used by routes related to current domain
        const appsRelatedToDomain = new Set();
        routesRelatedToDomain.forEach(({ slots }) => {
            if (!slots) {
                return;
            }

            Object.values(slots).map(({ appName }) => {
                appsRelatedToDomain.add(appName);
            });
        });

        // apps which aren't associated with any route
        const appsWithoutRoutes = Object.keys(allApps);
        allRoutes.forEach(({ slots }) => {
            if (!slots) {
                return;
            }

            Object.values(slots).map(({ appName }) => {
                const index = appsWithoutRoutes.indexOf(appName);
                if (index !== -1) {
                    appsWithoutRoutes.splice(index, 1);
                }
            });
        });

        const allowedAppNames = [...appsRelatedToDomain, ...appsWithoutRoutes];

        const apps = {};
        Object.entries(allApps).forEach(([appName, appData]) => {
            if (appData.enforceDomain) {
                if (appData.enforceDomain === domain) {
                    delete appData.enforceDomain;

                    apps[appName] = appData;
                }
                return;
            }
            
            if (allowedAppNames.includes(appName)) {
                apps[appName] = appData;
            }
        });

        return apps;
    };
};
