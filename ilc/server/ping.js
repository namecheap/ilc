const registryService = require('./registry/factory');

module.exports = function (fastify, opts, done) {
    fastify.get('/ping', async (req, res) => {
        req.log.info('test');
        await registryService.preheat();
        res.status(200).send('pong');
    });

    done();
};
