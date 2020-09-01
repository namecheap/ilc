const axios = require('axios');
const urljoin = require('url-join');

module.exports = class Registry {
    #address;
    #logger;
    #cacheHeated = {
        config: false,
        template: false
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

        this.#cacheHeated.config = true;
        this.#cacheHeated.template = true;

        this.#logger.info('Registry preheated successfully!');
    }

    #getConfig = async () => {
        this.#logger.debug('Calling get config registry endpoint...');

        const res = await axios.get(urljoin(this.#address, 'api/v1/config'), {
            responseType: 'json',
        });

        this.#cacheHeated.config = true;

        return res.data;
    };

    #getTemplate = async (templateName) => {
        this.#logger.debug('Calling get template registry endpoint...');

        const res = await axios.get(urljoin(this.#address, 'api/v1/template', templateName, 'rendered'), {
            responseType: 'json',
        });

        this.#cacheHeated.template = true;

        return res.data;
    };
};
