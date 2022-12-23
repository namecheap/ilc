const config = require('config');
const registryService = require('./registry/factory');

module.exports = function (fastify, opts, done) {
    const healthCheckUrl = config.get('healthCheck.url');
    fastify.get(healthCheckUrl, async (req, res) => {
        await registryService.preheat();
        res.status(200).send('pong');
    });

    done();
};
