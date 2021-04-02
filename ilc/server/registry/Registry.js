const axios = require('axios');
const urljoin = require('url-join');

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

        this.getConfig = wrapFetchWithCache(this.#getConfig, {
            cacheForSeconds: 5,
        });
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

    #getConfig = async (options) => {
        this.#logger.debug('Calling get config registry endpoint...');

        const tplUrl = urljoin(this.#address, 'api/v1/config');
        let res;
        try {
            res = await axios.get(tplUrl, { responseType: 'json' });

            const { domain } = options?.filter || {};
            if (domain) {
                res.data = this.#filterConfigByDomain(res.data, domain);
            }
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

    /**
     * Returns new object with routes list for current domain
     * and without "supportedDomains" data and property "domainId" inside every "route"
     */
    #filterConfigByDomain = (config, domain) => {
        const { supportedDomains, ...configWithoutSupportedDomains } = config;

        const currentDomainId = supportedDomains.find(n => n.value === domain)?.id;
        configWithoutSupportedDomains.routes = configWithoutSupportedDomains.routes.reduce((acc, route) => {
            if (currentDomainId === route.domainId) {
                const { domainId, ...routeData } = route;
                acc.push(routeData);
            }
            return acc;
        }, []);

        return configWithoutSupportedDomains;
    };
};
