'use strict';

const serveStatic = require('serve-static');

module.exports = function (isProduction) {
    const serveStaticMiddleware = serveStatic('public', {
        setHeaders: (res, path) => {
            res.setHeader('Content-Encoding', 'gzip');
        },
    });

    if (isProduction) {
        return serveStaticMiddleware;
    }

    require('../systemjs/build');

    const webpackMiddleware = require('webpack-dev-middleware');
    const webpack = require('webpack');

    return [
        webpackMiddleware(webpack(require('../build/webpack.dev')), {
            publicPath: '/',
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Encoding": "gzip",
            },
            logLevel: 'debug',
        }),
        serveStaticMiddleware
    ];
};

