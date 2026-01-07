import { fastifyStatic } from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import path from 'node:path';

export async function registerStatic(app: FastifyInstance, prefix: string, isProduction: boolean) {
    if (!isProduction) {
        await import('../../systemjs/build' as string);

        const { default: webpackDevMiddleware } = await import('webpack-dev-middleware');
        const { default: webpack } = await import('webpack');
        const { default: webpackConfig } = await import('../../build/webpack.dev' as string);
        const compiler = webpack(webpackConfig);
        const devMiddleware = webpackDevMiddleware(compiler);

        app.addHook('onRequest', (request, reply, done) => {
            if (!request.url.startsWith(prefix)) {
                return done();
            }

            devMiddleware(request.raw, reply.raw, done);
        });
    }

    await app.register(fastifyStatic, {
        root: path.join(process.cwd(), 'public'),
        prefix,
    });
}
