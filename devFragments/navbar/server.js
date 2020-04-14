'use strict';

const express = require('express');
const cors = require('cors');

const React = require('react');
const ReactDOMServer = require('react-dom/server');
const {default: App} = require('./build/server');
const PORT = 8235;

const server = express();

if (process.env.NODE_ENV === 'development') {
    const webpack = require('webpack');
    const webpackMiddleware = require('webpack-dev-middleware');

    server.use(
        webpackMiddleware(webpack(require('./webpack.dev')), {
            publicPath: '/',
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            logLevel: 'debug',
        })
    );
} else {
    server.use(cors());
    server.use(express.static('build'));
}

server.use((req, res, next) => {
    if (req.headers['x-request-uri'] !== undefined) {
        req.url = req.headers['x-request-uri'];
    }

    next();
});

server.get('*', (req, res) => {
    res.setHeader("Content-Type", "text/html");

    const html = ReactDOMServer.renderToString(App(req.url));
    res.send(html);

});

const port = PORT || 3000;

server.listen(port, () => {
    console.log(`Navbar server started at port ${port}`);
});
