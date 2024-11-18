import config from 'config';
import type { FastifyReply, FastifyRequest, Plugin, RegisterOptions } from 'fastify';
import type http from 'http';
import { Registry } from '../types/Registry';

export function pingPluginFactroy(
    registry: Registry,
): Plugin<
    http.Server,
    http.IncomingMessage,
    http.ServerResponse,
    RegisterOptions<http.Server, http.IncomingMessage, http.ServerResponse>
> {
    return (fastify, opts, done) => {
        const healthCheckUrl = config.get<string>('healthCheck.url');
        fastify.get(healthCheckUrl, async (req: FastifyRequest, res: FastifyReply<http.ServerResponse>) => {
            await registry.preheat();
            res.status(200).send('pong');
        });

        done();
    };
}
