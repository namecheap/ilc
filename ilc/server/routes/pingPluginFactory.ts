import config from 'config';
import type { FastifyPlugin } from 'fastify';
import { Registry } from '../types/Registry';

export function pingPluginFactroy(registry: Registry): FastifyPlugin {
    return (fastify, opts, done) => {
        const healthCheckUrl = config.get<string>('healthCheck.url');
        fastify.get(healthCheckUrl, async (req, res) => {
            await registry.preheat();
            res.status(200).send('pong');
        });

        done();
    };
}
