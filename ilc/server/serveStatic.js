'use strict';

const express = require('express');

module.exports = function (isProduction) {
    if (isProduction) {
        return express.static('public');
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
        express.static('public')
    ];
};

