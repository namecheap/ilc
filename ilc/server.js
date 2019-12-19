const config = require('config');
const server = require('./http');
const app = require('express')();
const tailorFactory = require('./tailorFactory');
const serveStatic = require('./serveStatic');


const tailor = tailorFactory(config.get('registry.address'), config.get('cdnUrl'));
tailor.on('error', (req, err) => {
    console.error('Tailor error:');
    console.error(err);
});


app.use(serveStatic(config.get('productionMode')));


app.get('*', (req, res) => {
    req.headers['x-request-uri'] = req.url; //TODO: to be removed & replaced with routerProps

    return tailor.requestHandler(req, res);
});

app.disable('x-powered-by');

server(app);
