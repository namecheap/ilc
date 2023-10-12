'use strict';

const serveStatic = require('serve-static');

module.exports = function (isProduction) {
    if (isProduction) {
        return serveStatic('public');
    }

    require('../systemjs/build');

    const webpackDevMiddleware = require('webpack-dev-middleware');
    const webpack = require('webpack');
    const webpackConfig = require('../build/webpack.dev');
    const compiler = webpack(webpackConfig);

    return [webpackDevMiddleware(compiler), serveStatic('public')];
};
