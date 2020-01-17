require('newrelic');
require('./express/monkey/express-promise');

const config = require('config');
const server = require('./http');
const app = require('express')();
const tailorFactory = require('./tailorFactory');
const serveStatic = require('./serveStatic');
const registryService = require('./server/registry/factory');
const errorHandler = require('./server/errorHandler');

app.use(require('./server/ping'));

const tailor = tailorFactory(config.get('cdnUrl'));

if (config.get('cdnUrl') === null) {
    app.use('/_ilc/', serveStatic(config.get('productionMode')));
}

app.get('/_ilc/api/v1/registry/template/:templateName', async (req, res) => {
    const data = await registryService.getTemplate(req.params.templateName);

    return res.status(200).send(data.data.content);
});

app.get('*', (req, res) => {
    req.headers['x-request-uri'] = req.url; //TODO: to be removed & replaced with routerProps
    tailor.requestHandler(req, res);
});

app.use(errorHandler);

app.disable('x-powered-by');

server(app);
