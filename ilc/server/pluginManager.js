'use strict';

const path = require('path');
const fg = require('fast-glob');
const { LEGACY_PLUGINS_DISCOVERY } = require('../common/environment');
const serverPlugins = require('../server.plugins');

function loadPlugins() {
    if (!LEGACY_PLUGINS_DISCOVERY) {
        return serverPlugins;
    }

    if (LEGACY_PLUGINS_DISCOVERY) {
        const pluginPaths = fg.sync(['ilc-plugin-*/package.json', '@*/ilc-plugin-*/package.json'], {
            cwd: path.resolve(__dirname, '../node_modules'),
            absolute: true,
        });

        return pluginPaths.map((pluginPath) => {
            const relativePluginPath = path.resolve(pluginPath, '..', require(pluginPath).main);
            return require(relativePluginPath);
        });
    }
}

module.exports = new (require('ilc-plugins-sdk').PluginManager)(loadPlugins());
