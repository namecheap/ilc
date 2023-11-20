const axios = require('axios');
const urljoin = require('url-join');
const { cloneDeep } = require('../../common/utils');
const extendError = require('@namecheap/error-extender');
const { context } = require('../context/context');
const { isTemplateValid } = require('./isTemplateValid');

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
    constructor(address, wrapFetchWithCache, logger) {
        this.#address = address;
        this.#logger = logger;

        const getConfigMemo = (...args) => {
            const store = context.getStore();

            const memo = wrapFetchWithCache(
                this.#getConfig.bind(this, ...args),
                {
                    cacheForSeconds: 5,
                    name: 'registry_getConfig',
                },
                store,
            );

            return memo(...args);
        };

        this.getConfig = async (options) => {
            const fullConfig = await getConfigMemo(options);
            fullConfig.data = this.#filterConfig(fullConfig.data, options?.filter);
            return fullConfig;
        };

        this.getRouterDomains = async (...args) => {
            const store = context.getStore();
            const memo = wrapFetchWithCache(
                this.#getRouterDomains,
                {
                    cacheForSeconds: 30,
                    name: 'registry_routerDomains',
                },
                store,
            );

            return await memo(...args);
        };

        const getTemplateMemo = async (...args) => {
            const store = context.getStore();

            const memo = wrapFetchWithCache(
                this.#getTemplate,
                {
                    cacheForSeconds: 30,
                    name: 'registry_getTemplate',
                },
                store,
            );

            return await memo(...args);
        };

        this.getTemplate = async (templateName, { locale, forDomain } = {}) => {
            if (templateName === '500' && forDomain) {
                const routerDomains = await this.getRouterDomains();
                const redefined500 = routerDomains.data.find((item) => item.domainName === forDomain)?.template500;
                templateName = redefined500 || templateName;
            }

            return await getTemplateMemo(templateName, { locale, domain: forDomain });
        };
    }

    async preheat() {
        if (this.#cacheHeated.template && this.#cacheHeated.config && this.#cacheHeated.routerDomains) {
            return;
        }

        this.#logger.info('Registry is preheating...');

        // ToDo: how to handle preheat. Load for main domain ????
        await Promise.all([this.getConfig(), this.getTemplate('500'), this.getRouterDomains()]);

        this.#logger.info('Registry preheated successfully!');
    }

    #getConfig = async (options) => {
        this.#logger.debug('Calling get config registry endpoint...');

        const urlGetParams = options?.filter?.domain
            ? `?domainName=${encodeURIComponent(options.filter.domain.toLowerCase())}`
            : '';

        const tplUrl = urljoin(this.#address, 'api/v1/config', urlGetParams);

        let fullConfig;
        try {
            fullConfig = await axios.get(tplUrl, { responseType: 'json' });
        } catch (error) {
            throw new errors.RegistryError({
                message: `Error while requesting config from registry`,
                cause: error,
                data: {
                    requestedUrl: tplUrl,
                },
            });
        }

        // Looks like a bug because in case of error we should try to heat cache on next iteration
        // We have already faced an issue with inconsistent cache between different nodes
        this.#cacheHeated.config = true;

        return fullConfig.data;
    };

    #getTemplate = async (templateName, { locale, domain }) => {
        this.#logger.debug('Calling get template registry endpoint...');

        const params = new URLSearchParams();
        if (locale) {
            params.set('locale', locale);
        }

        if (domain) {
            params.set('domain', domain.toLowerCase());
        }

        const queryString = params.toString();
        const tplUrl = urljoin(
            this.#address,
            'api/v1/template',
            templateName,
            'rendered',
            queryString.length > 0 ? '?' + queryString : '',
        );

        let res;
        try {
            res = await axios.get(tplUrl, { responseType: 'json' });
        } catch (e) {
            throw new errors.RegistryError({
                message: `Error while requesting rendered template "${templateName}" from registry`,
                cause: e,
                data: {
                    requestedUrl: tplUrl,
                },
            });
        }

        const rawTemplate = res.data.content;

        if (!isTemplateValid(rawTemplate)) {
            throw new errors.RegistryError({ message: `Invalid structure in template "${templateName}"` });
        }

        const lastMatchOffset = rawTemplate.lastIndexOf('<ilc-slot');
        const processedTemplate = rawTemplate.replace(/<ilc-slot\s+id="(.+)"\s*\/?>/gm, function (match, id, offset) {
            return (
                `<!-- Region "${id}" START -->\n` +
                // We change simplified slot definition onto TailorX required one
                `<div id="${id}"><slot name="${id}"></slot></div>\n` +
                // Used for AsyncBootUp functionality at client side
                `<script>window.ilcApps.push('${id}');${
                    lastMatchOffset === offset ? 'window.ilcApps.push(Infinity);' : ''
                }</script>\n` +
                `<!-- Region "${id}" END -->`
            );
        });

        this.#cacheHeated.template = true;

        return { ...res.data, content: processedTemplate };
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
                    requestedUrl: url,
                },
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
            const routesRelatedToDomain = [...clonedConfig.routes, ...Object.values(clonedConfig.specialRoutes)];
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

        return Object.keys(specialRoutesForCurrentDomain).length
            ? specialRoutesForCurrentDomain
            : specialRoutesWithoutDomain;
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
