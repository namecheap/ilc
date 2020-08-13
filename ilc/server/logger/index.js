'use strict';

const pluginManager = require('../pluginManager/factory');

let logger = pluginManager.getLogger();
if (logger === null) {
    const pino = require('pino');
    logger = pino(require('./defaultLoggerConf'));
}

module.exports = logger;
