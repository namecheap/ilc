const newrelic = require('newrelic');

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
    const statusCode = isNoTemplate ? 404 : 500;

    res.status(statusCode);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Content-Type', 'text/html');
    res.render(`${statusCode}`, { errorId });

    const errInfo = {
        type: 'TAILOR_ERROR',
        name: err.toString(),
        extraInfo: {
            errorId,
        },
    };

    if (newrelic && newrelic.noticeError) {
        newrelic.noticeError(err, JSON.stringify(errInfo));
    }
    console.error(errInfo);
});

app.set('view engine', 'ejs');
app.set('views', './templates');

app.use('/_ilc/', serveStatic(config.get('productionMode')));

app.get('/_ilc/page/500/:errorId', (req, res) => {
    const statusCode = 200;
    const errorId = req.params.errorId;

    res.status(statusCode);
    res.render('500', { statusCode: 500, errorId });
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
    res.setHeader('Content-Type', 'text/html');
    res.render('500', { errorId });

    const errInfo = {
        type: 'SERVER_ERROR',
        name: err.toString(),
        extraInfo: {
            errorId,
        },
    };

    if (newrelic && newrelic.noticeError) {
        newrelic.noticeError(err, JSON.stringify(errInfo));
    }
    console.error(errInfo);
});

app.disable('x-powered-by');

server(app);
