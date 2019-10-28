'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const {createBundleRenderer} = require('vue-server-renderer');
const bundle = require('./dist/vue-ssr-server-bundle.json');
const clientManifest = require('./dist/vue-ssr-client-manifest.json');
const clientManifestSpa = require('./dist/vue-ssr-client-manifest-spa.json');
const template = fs.readFileSync('./src/index.template.html', 'utf-8');
const templateFragment = fs.readFileSync('./src/index.fragment.template.html', 'utf-8');
const cors = require('cors');
const PORT = 3000;

const server = express();

server.use(cors());

const renderer = createBundleRenderer(bundle, {
    template: template,
    clientManifest: clientManifest,
    runInNewContext: false
});
const rendererFragment = createBundleRenderer(bundle, {
    template: templateFragment,
    clientManifest: clientManifestSpa,
    runInNewContext: false,
    inject: false
});

server.use((req, res, next) => {
    if (req.headers['x-request-uri'] !== undefined) {
        req.url = req.headers['x-request-uri'];
    }

    next();
});

server.use('/dist', express.static(path.resolve(__dirname, './dist')));
server.use('/public', express.static(path.resolve(__dirname, './public')));
server.use('/manifest.json', express.static(path.resolve(__dirname, './manifest.json')));

//TODO: this should be available only in dev mode
server.get('/_spa/dev/assets-discovery', (req, res) => {
    res.send({
        spaBundle: clientManifestSpa.publicPath + clientManifestSpa.all.find(v => v.endsWith('.js')),
        cssBundle: clientManifestSpa.publicPath + clientManifestSpa.all.find(v => v.endsWith('.css')),
    });
});

server.get('*', (req, res) => {
    res.setHeader("Content-Type", "text/html");

    const context = {
        url: req.url,
    };

    const currRenderer = !!req.query.fragment ? rendererFragment : renderer;

    currRenderer.renderToString(context, (err, html) => {
        if (err) {
            if (err.code === 404) {
                res.status(400).send('Not found');
            } else {
                console.log(err);
                res.status(500).send('Internal server error');
            }
        } else {
            if (req.query.fragment !== undefined && typeof context.renderStyles === 'function') {
                res.append('x-head-title', Buffer.from(context.meta.inject().title.text()).toString('base64'));
                res.append('x-head-meta', Buffer.from(context.meta.inject().meta.text()).toString('base64'));

                const links = clientManifestSpa.all.filter(v => v.endsWith('.css')).map(v => `<${clientManifestSpa.publicPath}${v}>; rel="stylesheet"`);
                res.append('Link', links.join(', '));
            }
            res.send(html);
        }
    });

});

const port = PORT || 3000;

server.listen(port, () => {
    console.log("Server started")
});
