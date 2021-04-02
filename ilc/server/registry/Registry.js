const axios = require('axios');
const urljoin = require('url-join');
const { clone } = require('../../common/utils');

const extendError = require('@namecheap/error-extender');

const errors = {};
errors.RegistryError = extendError('RegistryError');

module.exports = class Registry {
    #address;
    #logger;
    #cacheHeated = {
        config: false,
        template: false,
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
        });

        this.getConfig = async (options) => {
            const res = await getConfigMemo();
            res.data = this.#filterConfig(res.data, options?.filter);
            return res;
        };

        this.getTemplate = wrapFetchWithCache(this.#getTemplate, {
            cacheForSeconds: 30,
        });
    }

    async preheat() {
        if (this.#cacheHeated.template && this.#cacheHeated.config) {
            return;
        }

        this.#logger.info('Registry is preheating...');

        await Promise.all([
            this.getConfig(),
            this.getTemplate('500'),
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

    #getTemplate = async (templateName) => {
        this.#logger.debug('Calling get template registry endpoint...');

        const tplUrl = urljoin(this.#address, 'api/v1/template', templateName, 'rendered');
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

        this.#cacheHeated.template = true;

        return res.data;
    };

    #filterConfig = (config, filter) => {
        if (!filter || !Object.keys(filter).length) {
            return config;
        }

        const clonedConfig = clone(config);
        const { domain } = filter;

        if (domain) {
            const currentDomainId = clonedConfig.routerDomains.find(n => n.value === domain)?.id;
            clonedConfig.routes = clonedConfig.routes.reduce((acc, route) => {
                // if current domain name exits in routerDomains then we use routes only for this domain
                // otherwise (when currentDomainId === undefined) we use routes which don't have specified domain name
                if (currentDomainId === route.domainId) {
                    const { domainId, ...routeData } = route;
                    acc.push(routeData);
                }
                return acc;
            }, []);

            delete clonedConfig.routerDomains;
        }

        return clonedConfig;
    };
};
