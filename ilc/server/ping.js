const registryService = require('./registry/factory');

module.exports = function (fastify, opts, done) {
    fastify.get('/ping', async (req, res, next) => {
        await registryService.preheat();
        res.status(200).send('pong');
    });

    done();
};
