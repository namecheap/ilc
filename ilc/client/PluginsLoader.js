import { manifest as clientPluginsManifest } from '../client.plugins.manifest';

export class PluginsLoader {
    load() {
        if (!LEGACY_PLUGINS_DISCOVERY_ENABLED) {
            return clientPluginsManifest.plugins;
        }

        if (LEGACY_PLUGINS_DISCOVERY_ENABLED) {
            const context = require.context('../node_modules', true, /ilc-plugin-[^/]+\/browser\.js$/);

            const contextPlugins = [
                ...context.keys().map((pluginPath) => {
                    const loadedPlugin = context(pluginPath);
                    return loadedPlugin.default || loadedPlugin;
                }),
            ];

            return contextPlugins;
        }
    }
}
