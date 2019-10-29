/* eslint-env node */
const config = require('./webpack.config.js');
const webpack = require('webpack');
const path = require('path');

config.entry = path.resolve(__dirname, 'src/server.js');
config.target = 'node';
config.output.filename = 'server.js';
config.output.libraryTarget = 'commonjs2';
config.plugins = [];
config.externals = [];


module.exports = config;


