const path = require('path');
const { context } = require('./context/context');

process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../config');
require('newrelic');

const registryService = require('./registry/factory');
const pluginManager = require('./plugins/pluginManager');

const runServer = require('./server');
const createApp = require('./app');

runServer(createApp(registryService, pluginManager, context));
