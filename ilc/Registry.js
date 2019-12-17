const _ = require('lodash');
const axios = require('axios');

module.exports = class Registry {
    #registryEndpoint;
    #cacheForSeconds;

    /** @type {Router} */
    #data = null;
    #cachedAt = 0;
    #cacheResolutionPromise = null;

    constructor(registryEndpoint, cacheForSeconds = 5) {
        this.#registryEndpoint = registryEndpoint;
        this.#cacheForSeconds = cacheForSeconds;
    }


    async getConfig() {
        const now = Math.floor(Date.now() / 1000);

        if (this.#data === null || this.#cachedAt < now - this.#cacheForSeconds) {
            if (this.#cacheResolutionPromise !== null) {
                if (this.#data !== null) { // It's better to return stale data rather then cause delay
                    return this.#data;
                }

                return this.#cacheResolutionPromise;
            }

            this.#cacheResolutionPromise = this.#requestRouterConf().then(v => {
                this.#cacheResolutionPromise = null;
                this.#cachedAt = now;
                this.#data = {
                    data: v,
                    checkAfter: now + this.#cacheForSeconds,
                };

                return this.#data;
            }).catch(err => {
                this.#cacheResolutionPromise = null;

                if (this.#data !== null) {
                    console.error('Error refreshing configuration from registry...');
                    console.error(err);
                } else {
                    throw err;
                }
            });

            if (this.#data !== null) { // It's better to return stale data rather then cause delay
                return this.#data;
            }

            return this.#cacheResolutionPromise;
        }

        return this.#data;
    }

    #requestRouterConf = async () => {
        console.log('Calling registry...');
        const res = await axios.get(this.#registryEndpoint + '/api/v1/config', {responseType: 'json'});

        return res.data;
    };

};
