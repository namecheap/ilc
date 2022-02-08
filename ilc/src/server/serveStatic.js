'use strict';

const serveStatic = require('serve-static')

module.exports = function (isProduction) {
    if (isProduction) {
        return serveStatic('public');
    }

    require('../systemjs/build');

    const webpackMiddleware = require('webpack-dev-middleware');
    const webpack = require('webpack');

    return [
        webpackMiddleware(webpack(require('../build/webpack.dev')), {
            publicPath: '/',
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            logLevel: 'debug',
        }),
        serveStatic('public')
    ];
};

