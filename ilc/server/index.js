import 'source-map-support/register';
import { registryFactory } from './registry/factory';

const path = require('path');
const { context } = require('./context/context');

process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../config');
require('newrelic');

const pluginManager = require('./plugins/pluginManager');

const runServer = require('./server');
const createApp = require('./app');

runServer(createApp(registryFactory(), pluginManager, context));
