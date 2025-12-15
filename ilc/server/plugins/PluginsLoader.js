const path = require('node:path');
const { globSync } = require('node:fs');

const { Environment } = require('../../common/Environment');
const { manifest: serverPluginsManifest } = require('../../server.plugins.manifest');

class PluginsLoader {
    load() {
        const environment = new Environment(process.env);
        if (!environment.isLegacyPluginsDiscoveryEnabled()) {
            return serverPluginsManifest.plugins;
        }

        if (environment.isLegacyPluginsDiscoveryEnabled()) {
            const cwd = path.resolve(__dirname, '../../../node_modules'); // dist dir
            const patterns = ['ilc-plugin-*/package.json', '@*/ilc-plugin-*/package.json'];
            const pluginPaths = patterns.flatMap((pattern) => globSync(pattern, { cwd }).map((p) => path.join(cwd, p)));

            return pluginPaths.map((pluginPath) => {
                const relativePluginPath = path.resolve(pluginPath, '..', require(pluginPath).main);
                return require(relativePluginPath);
            });
        }
    }
}

module.exports = {
    PluginsLoader,
};
