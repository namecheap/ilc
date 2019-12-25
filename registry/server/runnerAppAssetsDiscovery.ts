import path from "path";

process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../config');
require('newrelic'); //Should be lower then NODE_CONFIG_DIR env var definition

const tmpInterval = Number(process.env.INTERVAL);
const interval = Number.isNaN(tmpInterval) ? undefined : tmpInterval;

import AppAssetsDiscovery from './common/services/AppAssetsDiscovery';
new AppAssetsDiscovery().start(interval);
