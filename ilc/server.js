require('newrelic');
require('./monkey/express-promise');

const uuidv4 = require('uuid/v4');
const config = require('config');
const server = require('./http');
const app = require('express')();
const tailorFactory = require('./tailorFactory');
const serveStatic = require('./serveStatic');

app.get('/ping', (req, res) => res.send('pong'));

const tailor = tailorFactory(config.get('registry.address'), config.get('cdnUrl'));
tailor.on('error', (req, err) => {
    console.error('Tailor error:');
    console.error(err);
});

app.set('view engine', 'ejs');
app.set('views', './templates');

app.use('/_ilc/', serveStatic(config.get('productionMode')));

app.get('/_ilc/page/500/:errorId', (req, res) => {
    const statusCode = 200;
    const errorId = req.params.errorId;

    res.status(statusCode);
    res.render('error', { statusCode: 500, errorId });
});

app.get('*', async (req, res) => {
    req.headers['x-request-uri'] = req.url; //TODO: to be removed & replaced with routerProps

    await tailor.requestHandler(req, res);
});

app.use((err, req, res, next) => {
    const statusCode = 500;
    const errorId = uuidv4();

    res.status(statusCode);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Content-Type', 'text/html');
    res.render('error', { statusCode, errorId });
});

app.disable('x-powered-by');

server(app);
