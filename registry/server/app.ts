require('./util/express-promise');

import config from 'config';
import express, {RequestHandler} from 'express';
import bodyParser from 'body-parser';

import pong from './util/ping';
import * as routes from "./routes";
import errorHandler from './errorHandler';
import serveStatic from 'serve-static';
import auth from './auth';
import settingsService from './settings/services/SettingsService';

export default (withAuth: boolean = true) => {
    // As in production there can be 2+ instances of the ILC registry
    // AppAssetsDiscovery should be run separately via "npm run assetsdiscovery"
    !['production', 'test'].includes(process.env.NODE_ENV!) && require('./runnerAppAssetsDiscovery');

    const app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded());

    app.get('/ping', pong);

    app.use('/', serveStatic('client/dist'));

    let authMw: RequestHandler = (req, res, next) => next();
    if (withAuth) {
        authMw = auth(app, settingsService, {
            session: {secret: config.get('auth.sessionSecret')}
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
    app.use('/api/v1/public', routes.public);

    app.use(errorHandler);

    app.disable('x-powered-by');

    return app;
}
