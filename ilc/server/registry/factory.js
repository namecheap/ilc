const config = require('config');
const localStorage = require('../../common/localStorage');
const Registry = require('./Registry');
const wrapFetchWithCache = require('../../common/wrapWithCache');
const reportingPluginManager = require('../plugins/reportingPlugin');

const logger = reportingPluginManager.getLogger();

module.exports = new Registry(config.get('registry.address'), wrapFetchWithCache(localStorage, logger), logger);
