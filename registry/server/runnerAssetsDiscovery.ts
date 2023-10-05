import 'newrelic';

import AssetsDiscovery from './common/services/assets/AssetsDiscovery';
import { getLogger } from './util/logger';
import { loadPlugins } from './util/pluginManager';

const tmpInterval = Number(process.env.INTERVAL);
const interval = Number.isNaN(tmpInterval) ? undefined : tmpInterval;

(() => {
    try {
        loadPlugins();
        new AssetsDiscovery('apps').start(interval);
        new AssetsDiscovery('shared_libs').start(interval);
    } catch (e: unknown) {
        getLogger().error(e as Error);
        process.exit(1);
    }
})();
