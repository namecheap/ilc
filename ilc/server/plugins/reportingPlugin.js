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

    getRequestId() {
        return this.#plugin.genReqId();
    }

    getLogger() {
        const logger = this.#plugin.logger;
        return enhanceLogger(logger, { requestIdLogLabel: this.#plugin.requestIdLogLabel ?? 'requestId' });
    }
}

module.exports = new ReportingPlugin();
