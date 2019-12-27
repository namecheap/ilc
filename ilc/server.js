require('./express/monkey/express-promise');

const config = require('config');
const server = require('./http');
const app = require('express')();
const tailorFactory = require('./tailorFactory');
const serveStatic = require('./serveStatic');
const registryService = require('./server/registry/registryService');
const preheatRegistry = require('./server/registry/preheatRegistry');
const errorHandler = require('./server/errors/errorHandler');
const tailorErrorHandler = require('./server/errors/tailorErrorHandler');

app.get('/ping', async (req, res, next) => {
    await preheatRegistry();
    res.status(200).send('pong');
});

// Support of legacy infrastructures
app.get('/api/v1/monitor/ping/:code/:optional?', (req, res) => {
    await preheatRegistry();
    res.send('PONG' + req.params.code);
});

const tailor = tailorFactory(config.get('cdnUrl'));

tailor.on('error', tailorErrorHandler);

if (config.get('cdnUrl') === null) {
    app.use('/_ilc/', serveStatic(config.get('productionMode')));
}

app.get('/_ilc/api/v1/page/500', async (req, res, next) => {
    const data = await registryService.getTemplate('500');
    res.status(200).send(data.data.content);
});

app.get('*', (req, res, next) => {
    req.headers['x-request-uri'] = req.url; //TODO: to be removed & replaced with routerProps
    tailor.requestHandler(req, res);
});

app.use(errorHandler);

app.disable('x-powered-by');

server(app);
