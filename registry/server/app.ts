import config from 'config';
import express, { Application, RequestHandler } from 'express';
import serveStatic from 'serve-static';

import { OPENID_CALLBACK_URL, useAuth } from './auth';
import errorHandler from './errorHandler';
import { loadPlugins } from './util/pluginManager';
import * as routes from './routes/routes';
import pong from './util/ping';
import { contextMiddleware } from './middleware/context';
import { logConnectionString } from './util/db';
import { getLogger } from './util/logger';
import { OpenIdService } from './auth/services/OpenIdService';
import { unless } from './middleware/unless';
import db from './db';
import { createServices } from './composition';
import { createSharedPropsRouter } from './sharedProps/routes';
import { createVersioningRouter } from './versioning/routes';
import { createRouterDomainsRouter } from './routerDomains/routes';
import { createAuthEntitiesRouter } from './authEntities/routes';
import { createTemplatesRouter } from './templates/routes';
import { createSharedLibsRouter } from './sharedLibs/routes';
import { createEntriesRouter } from './entries/entries';
import { createAppRoutesRouter } from './appRoutes/routes';
import { createAppsRouter } from './apps/routes';
import { createSettingsRouter } from './settings/routes';

export default async (withAuth: boolean = true): Promise<Application> => {
    loadPlugins();
    logConnectionString();
    // As in production there can be 2+ instances of the ILC registry
    // AssetsDiscovery should be run separately via "npm run assetsdiscovery"
    !['production', 'test'].includes(process.env.NODE_ENV!) && require('./runnerAssetsDiscovery');

    const services = createServices(db);
    const app = express();
    app.use(contextMiddleware);
    const healthCheckUrl = config.get<string>('healthCheck.url');

    app.use(
        unless(
            OPENID_CALLBACK_URL,
            express.json({
                limit: config.get<string>('http.requestLimit'),
            }),
        ),
    );

    app.get(healthCheckUrl, pong);

    app.use('/', serveStatic('client/dist'));

    let authMw: RequestHandler[] = [(req, res, next) => next()];
    if (withAuth) {
        const openIdService = new OpenIdService(services.settings);
        authMw = await useAuth(
            app,
            openIdService,
            {
                session: {
                    secret: config.get('auth.sessionSecret'),
                    cookie: { httpOnly: true, secure: config.get('auth.cookieSecure') },
                },
            },
            getLogger(),
        );
    }

    app.use(
        '/api/v1/config',
        routes.config(authMw, services.config, {
            db,
            versioning: services.versioning,
            settingsService: services.settings,
        }),
    );
    app.use('/api/v1/app', authMw, createAppsRouter(services.apps));
    app.use('/api/v1/template', createTemplatesRouter(services.templates, authMw));
    app.use('/api/v1/route', authMw, createAppRoutesRouter(services.routes));
    app.use('/api/v1/shared_props', authMw, createSharedPropsRouter(services.sharedProps));
    app.use('/api/v1/auth_entities', authMw, createAuthEntitiesRouter(services.authEntities));
    app.use('/api/v1/versioning', authMw, createVersioningRouter(services.versioning));
    app.use('/api/v1/settings', createSettingsRouter(services.settings, authMw));
    app.use('/api/v1/router_domains', createRouterDomainsRouter(services.routerDomains, authMw));
    app.use('/api/v1/shared_libs', authMw, createSharedLibsRouter(services.sharedLibs));
    app.use('/api/v1/public', routes.public);
    app.use('/api/v1/entries', authMw, createEntriesRouter(services.apps, services.sharedLibs));

    app.use(errorHandler);

    app.disable('x-powered-by');

    return app;
};
