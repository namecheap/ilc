const pluginManager = require('./pluginManager');
const enhanceLogger = require('../logger/enhanceLogger');

class ReportingPlugin {
    #plugin;

    constructor() {
        this.#plugin = pluginManager.getReportingPlugin();
    }

    getInstance() {
        return this.#plugin;
    }

    getLogger() {
        const logger = this.#plugin.logger;
        return enhanceLogger(logger, {
            reqIdKey: this.#plugin.requestIdLogLabel || 'operationId',
        });
    }
}

module.exports = new ReportingPlugin();
