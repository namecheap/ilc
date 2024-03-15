const axios = require('axios');
const urljoin = require('url-join');
const { isTemplateValid } = require('./isTemplateValid');
const { RegistryError, ValidationRegistryError, NotFoundRegistryError } = require('./errors');

const VALID_TEMPLATE_NAME = /^[a-zA-Z0-9\-_]{1,50}$/;

module.exports = class Registry {
    #address;
    #configUrl;
    #logger;
    #cacheHeated = {
        config: false,
        template: false,
        routerDomains: false,
    };

    /**
     * @param {string} address - registry address. Ex: http://registry:8080/
     * @param {Function} cacheWrapper - cache provider
     * @param {Object} logger - log provider that implements "console" interface
     */
    constructor(address, cacheWrapper, logger) {
        this.#address = address;
        this.#configUrl = urljoin(address, 'api/v1/config');
        this.#logger = logger;

        const fetchConfigMemoized = cacheWrapper.wrap(this.#fetchConfig.bind(this), {
            cacheForSeconds: 5,
            name: 'registry_getConfig',
        });

        const getTemplateMemoized = cacheWrapper.wrap(this.#getTemplate.bind(this), {
            cacheForSeconds: 30,
            name: 'registry_getTemplate',
        });

        this.getRouterDomains = cacheWrapper.wrap(this.#getRouterDomains.bind(this), {
            cacheForSeconds: 30,
            name: 'registry_routerDomains',
        });

        this.getConfig = async (options) => {
            const { data } = await fetchConfigMemoized(options);
            // TODO: Memoize filtration as well
            const filteredData = this.#filterAndTransformConfig(data, options?.filter);
            return filteredData;
        };

        this.getTemplate = async (templateName, { locale, forDomain } = {}) => {
            if (templateName === '500' && forDomain) {
                const routerDomains = await this.getRouterDomains();
                const redefined500 = routerDomains.data.find((item) => item.domainName === forDomain)?.template500;
                templateName = redefined500 || templateName;
            }

            return await getTemplateMemoized(templateName, { locale, domain: forDomain });
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

    /**
     * Fetch config from registry
     * @param {String} options.filter.domain
     * @returns {Object}
     */
    async #fetchConfig(options) {
        this.#logger.debug('Calling get config registry endpoint...');
        try {
            const { data } = await axios.get(this.#configUrl, { params: { domainName: options?.filter?.domain } });
            this.#cacheHeated.config = true;
            return data;
        } catch (error) {
            throw new RegistryError({
                message: `Error while requesting config from registry`,
                cause: error,
                data: {
                    requestedUrl: this.#configUrl,
                },
            });
        }
    }

    #getTemplate = async (templateName, { locale, domain }) => {
        if (!VALID_TEMPLATE_NAME.test(templateName)) {
            throw new ValidationRegistryError({
                message: `Invalid template name ${templateName}`,
            });
        }
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
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                throw new NotFoundRegistryError({
                    message: `Not found template "${templateName}" in registry`,
                    cause: error,
                    data: {
                        requestedUrl: tplUrl,
                    },
                });
            }
            throw new RegistryError({
                message: `Error while requesting rendered template "${templateName}" from registry`,
                cause: error,
                data: {
                    requestedUrl: tplUrl,
                },
            });
        }

        const rawTemplate = res.data.content;

        if (!isTemplateValid(rawTemplate)) {
            throw new RegistryError({ message: `Invalid structure in template "${templateName}"` });
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
            throw new RegistryError({
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

    /**
     * Filter config per domain
     * Changes specialRoutes from array to dictionary
     * @param {Config} config
     * @param {String} filter.domain
     * @returns {TransformedConfig} filtered config
     */
    #filterAndTransformConfig(config, filter) {
        if (filter?.domain) {
            const filteredRoutes = this.#filterRoutesByDomain(config.routes, filter.domain);
            const filteredSpecialRoutes = this.#filterAndTransformSpecialRoutesByDomain(
                config.specialRoutes,
                filter.domain,
            );
            const routesRelatedToDomain = [...filteredRoutes, ...Object.values(filteredSpecialRoutes)];
            const allRoutes = [...config.routes, ...Object.values(config.specialRoutes)];
            const allApps = config.apps;
            const filteredApps = this.#getAppsByDomain(routesRelatedToDomain, allRoutes, allApps, filter.domain);
            return {
                ...config,
                apps: filteredApps,
                routes: filteredRoutes,
                specialRoutes: filteredSpecialRoutes,
            };
        }

        return config;
    }

    /**
     *
     * @param {Route[]} routes
     * @param {String} domain
     * @returns {Route[]} filtered routes
     */
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

    /**
     *
     * @param {SpecialRoute[]} specialRoutes
     * @param {String} domain
     * @returns {Record<string, SpecialRoute>} filtered and transformed special routes
     */
    #filterAndTransformSpecialRoutesByDomain = (specialRoutes, domain) => {
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
