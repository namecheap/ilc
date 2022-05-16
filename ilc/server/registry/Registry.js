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

            return await getTemplateMemo(templateName, { locale, domain: forDomain});
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

    #getTemplate = async (templateName, { locale, domain }) => {
        this.#logger.debug('Calling get template registry endpoint...');

        const params = new URLSearchParams();
        if (locale) {
            params.set('locale', locale);
        }

        if (domain) {
            params.set('domain', domain);
        }

        const queryString = params.toString(); 
        const tplUrl = urljoin(this.#address, 'api/v1/template', templateName, 'rendered', queryString.length > 0 ? '?' + queryString : '');

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
            const routesForCurrentDomain = [];
            const routesWithoutDomain = [];

            clonedConfig.routes.forEach((route) => {
                const { domain: routeDomain, ...routeData } = route; // remove property "domain" since it's unnecessary

                if (routeDomain === undefined) {
                    routesWithoutDomain.push(routeData);
                } else if (routeDomain === filter.domain) {
                    routesForCurrentDomain.push(routeData);
                }
            });

            clonedConfig.routes = routesForCurrentDomain.length ? routesForCurrentDomain : routesWithoutDomain;
        }

        const specialRoutesWithoutDomain = {};
        const specialRoutesForCurrentDomain = {};
        clonedConfig.specialRoutes.forEach((route) => {
            const { domain: routeDomain, specialRole, ...routeData } = route; // remove properties "domain" and "specialRole" since it's unnecessary

            if (routeDomain === undefined) {
                specialRoutesWithoutDomain[specialRole] = routeData;
            } else if (filter.domain && routeDomain === filter.domain) {
                specialRoutesForCurrentDomain[specialRole] = routeData;
            }
        });

        clonedConfig.specialRoutes = Object.keys(specialRoutesForCurrentDomain).length ? specialRoutesForCurrentDomain : specialRoutesWithoutDomain;

        return clonedConfig;
    };
};
