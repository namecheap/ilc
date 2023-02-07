const { context } = require('../context/context');

class AccessLogger {
    #ignoreUrls;

    constructor(config) {
        this.#ignoreUrls = config.get('logger.accessLog.ignoreUrls').split(',');
    }

    logRequest(logData = {}) {
        this.#log(logData, 'received request');
    }
    logResponse(logData = {}) {
        this.#log(logData, 'request completed');
    }

    #log(logData = {}, message) {
        if (typeof logData !== 'object' || logData === null) {
            throw new Error(
                `Invalid format of the passed log data for logging. Passed data: ${JSON.stringify(logData)}`,
            );
        }

        const store = context.getStore();
        const url = store.get('path');

        const logger = store.get('appLogger');
        if (!logger) {
            throw new Error('Logger is not available');
        }

        if (this.#shouldIgnoreUrl(url)) {
            return;
        }

        const logContext = {
            ...logData,
            ...{
                url,
                domain: store.get('domain'),
            },
        };

        logger.info(logContext, message);
    }

    #shouldIgnoreUrl(url) {
        return this.#ignoreUrls.includes(url);
    }
}

module.exports = AccessLogger;
