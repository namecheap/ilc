const path = require('path');

process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../config');
require('newrelic');

const runServer = require('./server');
const createApp = require('./app');

runServer(createApp());
