'use strict';

const path = require('path');
const requireContext = require('node-require-context');
const context = requireContext(path.resolve(__dirname, '../node_modules'), true, /ilc-plugin-.*\/dist\/server\.js$/);

module.exports = new (require('../common/PluginManager'))(context);
