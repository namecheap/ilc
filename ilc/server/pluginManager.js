'use strict';

const path = require('path');
const fg = require('fast-glob');

function context(id) {
    return require(id);
}

context.keys = function () {
    const pluginPaths = fg.sync(
        ['ilc-plugin-*/package.json', '@*/ilc-plugin-*/package.json'],
        {
            cwd: path.resolve(__dirname, '../node_modules'),
            absolute: true,
        }
    );

    return pluginPaths.map((pluginPath) => path.resolve(pluginPath, '..', require(pluginPath).main));
};

module.exports = new (require('../common/PluginManager'))(context);
