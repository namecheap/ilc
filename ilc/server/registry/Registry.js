const axios = require('axios');
const urljoin = require('url-join');

module.exports = class Registry {
    #address;

    constructor({
        address,
        wrapFetchWithCache
    }) {
        this.#address = address;

        this.getConfig = wrapFetchWithCache(this.#getConfig, {
            cacheForSeconds: 5,
        });
        this.getTemplate = wrapFetchWithCache(this.#getTemplate, {
            cacheForSeconds: 3600,
        });
    }

    #getConfig = async () => {
        console.log('Calling get config registry endpoint...');

        const res = await axios.get(urljoin(this.#address, 'api/v1/config'), {
            responseType: 'json',
        });

        return res.data;
    }

    #getTemplate = async (templateName) => {
        console.log('Calling get template registry endpoint...');

        const res = await axios.get(urljoin(this.#address, 'api/v1/template', templateName), {
            responseType: 'json',
        });

        return res.data;
    }
};
