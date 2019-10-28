const fs = require('fs');
const express = require('express');
const webpack = require('webpack');
const webpackMiddleware = require('webpack-dev-middleware');
const app = express();
const port = 8240;

const template = require('lodash.template');
const pageTpl = template(fs.readFileSync(__dirname + '/tpl.ejs'));


app.use(
    webpackMiddleware(webpack(require('./webpack.dev')), {
        publicPath: '/',
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        logLevel: 'debug',
    })
);

app.get('/fragment', (req, res) => {
    const appProps = JSON.parse(Buffer.from(req.query.appProps, 'base64').toString('utf8'));

    if (appProps._statusCode === '404') {
        res.status(404);
    }
    res.send(`<div data-ssr-content="true">${pageTpl({getCurrentPathProps: () => appProps})}</div>`);
});

app.listen(port, () => console.log(`System app listening on port ${port}!`));