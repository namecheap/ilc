/* eslint-env node */
const config = require('./webpack');

config.mode = 'development';
config.resolve.alias['single-spa'] = require.resolve('single-spa/lib/umd/single-spa.dev.js');
config.performance.hints = false;

module.exports = config;
