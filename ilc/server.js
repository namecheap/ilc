const newrelic = require('newrelic');

const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const uuidv4 = require('uuid/v4');
const config = require('config');
const { TEMPLATE_NOT_FOUND } = require('node-tailor/lib/fetch-template');
const server = require('./http');
const app = require('express')();
const tailorFactory = require('./tailorFactory');
const serveStatic = require('./serveStatic');

app.get('/ping', (req, res) => res.send('pong'));

const tailor = tailorFactory(config.get('registry.address'), config.get('cdnUrl'));

tailor.on('error', (err, req, res) => {
    const errorId = uuidv4();
    const isNoTemplate = err.code === TEMPLATE_NOT_FOUND || (err.data && err.data.code === TEMPLATE_NOT_FOUND);

    res.status(500);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    renderFile(res, `./data/templates/500.ejs`, { errorId });
    noticeError(err, {
        type: 'TAILOR_ERROR',
        name: err.toString(),
        extraInfo: {
            errorId,
            isNoTemplate,
        },
    });
});

app.use('/_ilc/', serveStatic(config.get('productionMode')));

app.get('/_ilc/page/500', (req, res) => {
    const template = fs.readFileSync(path.join(__dirname, './data/templates/500.ejs'), {
        encoding: 'utf8',
    });

    res.status(200).send(template);
});

app.get('*', (req, res) => {
    req.headers['x-request-uri'] = req.url; //TODO: to be removed & replaced with routerProps

    tailor.requestHandler(req, res);
});

app.use((err, req, res, next) => {
    const errorId = uuidv4();

    res.status(500);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    renderFile(res, './data/templates/500.ejs', { errorId });
    noticeError(err, {
        type: 'SERVER_ERROR',
        name: err.toString(),
        extraInfo: {
            errorId,
        },
    });
});

function noticeError(err, errInfo = {}) {
    if (newrelic && newrelic.noticeError) {
        newrelic.noticeError(err, JSON.stringify(errInfo));
    }
    console.error(errInfo);
}

function renderFile(res, filename, data, options) {
    ejs.renderFile(filename, data, options, (err, str) => {
        if (err === null) {
            res.send(str);
        } else {
            const errInfo = {
                type: 'EJS_ERROR',
                name: err.toString(),
                extraInfo: {
                    errorId: uuidv4(),
                },
            };

            res.status(500).json(errInfo);

            noticeError(err, errInfo);
        }
    });
}

app.disable('x-powered-by');

server(app);
