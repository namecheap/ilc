const path = require('path');

process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../config');
require('newrelic');

const server = require('./server');
const app = require('./app');

server(app());
