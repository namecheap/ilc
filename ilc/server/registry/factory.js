const config = require('config');
const localStorage = require('../../common/localStorage');
const Registry = require('./Registry');
const CacheWrapper = require('../../common/CacheWrapper');
const reportingPluginManager = require('../plugins/reportingPlugin');
const { context } = require('../context/context');
const logger = reportingPluginManager.getLogger();

module.exports = new Registry(
    config.get('registry.address'),
    new CacheWrapper(localStorage, logger, context.getStore()),
    logger,
);
