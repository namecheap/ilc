const newrelic = require('newrelic');

const registryService = require('../registry/factory');
const ErrorHandler = require('./ErrorHandler');

const reportingPluginManager = require('../plugins/reportingPlugin');
const logger = reportingPluginManager.getLogger();

module.exports = new ErrorHandler(registryService, newrelic, logger);
