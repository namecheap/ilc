require('./util/express-promise');

import bodyParser from 'body-parser';
import config from 'config';
import express, { Application, RequestHandler } from 'express';
import serveStatic from 'serve-static';

import auth from './auth';
import errorHandler from './errorHandler';
import { loadPlugins } from './util/pluginManager';
import * as routes from './routes/routes';
import settingsService from './settings/services/SettingsService';
import pong from './util/ping';
import { contextMiddleware } from './middleware/context';
import { logConnectionString } from './util/db';

export default async (withAuth: boolean = true): Promise<Application> => {
    loadPlugins();
    logConnectionString();
    // As in production there can be 2+ instances of the ILC registry
    // AssetsDiscovery should be run separately via "npm run assetsdiscovery"
    !['production', 'test'].includes(process.env.NODE_ENV!) && require('./runnerAssetsDiscovery');

    const app = express();
    app.use(contextMiddleware);
    const healthCheckUrl = config.get<string>('healthCheck.url');

    app.use(
        bodyParser.json({
            limit: config.get<string>('http.requestLimit'),
        }),
    );
    app.use(bodyParser.urlencoded({ extended: true }));

    app.get(healthCheckUrl, pong);

    app.use('/', serveStatic('client/dist'));

    let authMw: RequestHandler[] = [(req, res, next) => next()];
    if (withAuth) {
        authMw = await auth(app, settingsService, {
            session: { secret: config.get('auth.sessionSecret') },
        });
    }

    app.use('/api/v1/config', routes.config);
    app.use('/api/v1/app', authMw, routes.apps);
    app.use('/api/v1/template', routes.templates(authMw));
    app.use('/api/v1/route', authMw, routes.appRoutes);
    app.use('/api/v1/shared_props', authMw, routes.sharedProps);
    app.use('/api/v1/auth_entities', authMw, routes.authEntities);
    app.use('/api/v1/versioning', authMw, routes.versioning);
    app.use('/api/v1/settings', routes.settings(authMw));
    app.use('/api/v1/router_domains', routes.routerDomains(authMw));
    app.use('/api/v1/shared_libs', authMw, routes.sharedLibs);
    app.use('/api/v1/public', routes.public);
    app.use('/api/v1/entries', authMw, routes.entries);

    app.use(errorHandler);

    app.disable('x-powered-by');

    return app;
};
