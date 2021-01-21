const path = require('path');

process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../config');
require('newrelic');

const registryService = require('./registry/factory');
const pluginManager = require('./pluginManager');

const runServer = require('./server');
const createApp = require('./app');

runServer(createApp(registryService, pluginManager));
