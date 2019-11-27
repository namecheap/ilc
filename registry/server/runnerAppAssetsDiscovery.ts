const tmpInterval = Number(process.env.interval);
const interval = Number.isNaN(tmpInterval) ? undefined : tmpInterval;

import AppAssetsDiscovery from './services/AppAssetsDiscovery';
new AppAssetsDiscovery().start(interval);
