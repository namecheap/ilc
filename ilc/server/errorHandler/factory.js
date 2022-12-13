const newrelic = require('newrelic');

const registryService = require('../registry/factory');
const ErrorHandler = require('./ErrorHandler');
const logger = require('../logger');

module.exports = new ErrorHandler(registryService, newrelic, logger);
