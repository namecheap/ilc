const newrelic = require('newrelic');

const registryService = require('../registry/factory');
const ErrorHandler = require('./ErrorHandler');

module.exports = new ErrorHandler(
    registryService,
    newrelic,
    global.console,
);
