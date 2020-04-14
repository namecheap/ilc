const fs = require('fs');
const express = require('express');
const cors = require('cors');

const app = express();
const port = 8240;

const template = require('lodash.template');
const pageTpl = template(fs.readFileSync(__dirname + '/tpl.ejs'));


if (process.env.NODE_ENV === 'development') {
    const webpack = require('webpack');
    const webpackMiddleware = require('webpack-dev-middleware');

    app.use(
        webpackMiddleware(webpack(require('./webpack.dev')), {
            publicPath: '/',
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            logLevel: 'debug',
        })
    );
} else {
    app.use(cors());
    app.use(express.static('build'));
}


app.get('/fragment', (req, res) => {
    const appProps = JSON.parse(Buffer.from(req.query.appProps, 'base64').toString('utf8'));

    if (appProps._statusCode === '404') {
        res.status(404);
    }
    res.send(`<div data-ssr-content="true">${pageTpl({getCurrentPathProps: () => appProps})}</div>`);
});

app.listen(port, () => console.log(`System app listening on port ${port}!`));
