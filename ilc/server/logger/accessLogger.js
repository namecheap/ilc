const { context } = require('../context/context');

class AccessLogger {
    #ignoreUrls;
    #logger;

    constructor(config, logger) {
        this.#ignoreUrls = config.get('logger.accessLog.ignoreUrls').split(',');
        this.#logger = logger;
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

        const path = context.get('path');

        if (!this.#logger) {
            throw new Error('Logger is not available');
        }

        if (this.#shouldIgnoreUrl(path)) {
            return;
        }

        this.#logger.info(logData, message);
    }

    #shouldIgnoreUrl(url) {
        return this.#ignoreUrls.includes(url);
    }
}

module.exports = AccessLogger;
