const registryService = require('./registry/factory');

module.exports = function (fastify, opts, done) {
    fastify.get('/ping', async (req, res, next) => {
        await registryService.preheat();
        res.status(200).send('pong');
    });

    // Support of legacy infrastructures
    fastify.get('/api/v1/monitor/ping/:code/:optional?', async (req, res) => {
        await registryService.preheat();
        res.send('PONG' + req.params.code);
    });

    done();
};
