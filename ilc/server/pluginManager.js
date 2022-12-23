'use strict';

const { PluginsLoader } = require('./PluginsLoader');
const pluginLoader = new PluginsLoader();

module.exports = new (require('ilc-plugins-sdk').PluginManager)(...pluginLoader.load());
