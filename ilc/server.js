require('./express/monkey/express-promise');

const config = require('config');
const server = require('./http');
const app = require('express')();
const tailorFactory = require('./tailorFactory');
const serveStatic = require('./serveStatic');
const registryService = require('./server/registry/factory');
const errorHandler = require('./server/errors/errorHandler');

app.get('/ping', async (req, res, next) => {
    await registryService.preheat();
    res.status(200).send('pong');
});

// Support of legacy infrastructures
app.get('/api/v1/monitor/ping/:code/:optional?', async (req, res) => {
    await registryService.preheat();
    res.send('PONG' + req.params.code);
});

const tailor = tailorFactory(config.get('cdnUrl'));

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
