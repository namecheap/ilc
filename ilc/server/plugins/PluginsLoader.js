const path = require('path');
const fg = require('fast-glob');

const { Environment } = require('../../common/Environment');
const { manifest: serverPluginsManifest } = require('../../server.plugins.manifest');

class PluginsLoader {
    load() {
        const environment = new Environment(process.env);
        if (!environment.isLegacyPluginsDiscoveryEnabled()) {
            return serverPluginsManifest.plugins;
        }

        if (environment.isLegacyPluginsDiscoveryEnabled()) {
            const pluginPaths = fg.sync(['ilc-plugin-*/package.json', '@*/ilc-plugin-*/package.json'], {
                cwd: path.resolve(__dirname, '../../node_modules'),
                absolute: true,
            });

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
