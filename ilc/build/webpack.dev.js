/* eslint-env node */
const config = require('./webpack');
const webpack = require('webpack');

config.plugins.push(new webpack.NamedModulesPlugin());
config.plugins.push(new webpack.HotModuleReplacementPlugin());

config.mode = 'development';

config.resolve.alias["single-spa"] = require.resolve(`single-spa/lib/umd/single-spa.dev.js`);

module.exports = config;
