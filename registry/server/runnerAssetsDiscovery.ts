import './preload';

import AssetsDiscovery from './common/services/assets/AssetsDiscovery';
import { dbFactory, knexConfig } from './db';
import { getLogger } from './util/logger';
import { loadPlugins } from './util/pluginManager';

const tmpInterval = Number(process.env.INTERVAL);
const interval = Number.isNaN(tmpInterval) ? undefined : tmpInterval;

(() => {
    try {
        loadPlugins();
        const db = dbFactory(knexConfig);
        new AssetsDiscovery(db, 'apps').start(interval);
        new AssetsDiscovery(db, 'shared_libs').start(interval);
    } catch (e: unknown) {
        getLogger().fatal(e as Error);
        process.exit(1);
    }
})();
