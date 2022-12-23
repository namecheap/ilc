'use strict';

const path = require('path');
const fg = require('fast-glob');

function context(pluginPath) {
    return require(pluginPath);
}

context.keys = function () {
    const pluginPaths = fg.sync(['ilc-plugin-*/package.json', '@*/ilc-plugin-*/package.json'], {
        cwd: path.resolve(__dirname, '../node_modules'),
        absolute: true,
    });

    return pluginPaths.map((pluginPath) => path.resolve(pluginPath, '..', require(pluginPath).main));
};

module.exports = new (require('ilc-plugins-sdk').PluginManager)(context);
