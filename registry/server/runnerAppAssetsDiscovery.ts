const tmpInterval = Number(process.env.INTERVAL);
const interval = Number.isNaN(tmpInterval) ? undefined : tmpInterval;

import AppAssetsDiscovery from './common/services/AppAssetsDiscovery';
new AppAssetsDiscovery().start(interval);
