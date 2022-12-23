const { context } = require('../context/context');
const config = require('config');

class AccessLogger {
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
        const url = store.get('url');

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
        const ignoredUrls = config.get('logger.accessLog.ignoreUrls').split(',');
        return ignoredUrls.includes(url);
    }
}

module.exports = {
    accessLogger: new AccessLogger(),
};
