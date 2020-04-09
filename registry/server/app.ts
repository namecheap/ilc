require('./util/express-promise');

import config from 'config';
import express from 'express';
import bodyParser from 'body-parser';

import pong from './util/ping';
import * as routes from "./routes";
import errorHandler from './errorHandler';
import serveStatic from 'serve-static';
import auth from './auth';

export default (withAuth: boolean = true) => {
    // As in production there can be 2+ instances of the ILC registry
    // AppAssetsDiscovery should be run separately via "npm run assetsdiscovery"
    !['production', 'test'].includes(process.env.NODE_ENV!) && require('./runnerAppAssetsDiscovery');

    const app = express();

    app.use(bodyParser.json());

    app.get('/ping', pong);

    app.use('/', serveStatic('client/dist'));

    if (withAuth) {
        auth(app, {
            session: {secret: config.get('auth.sessionSecret')}
        });
    }

    app.use('/api/v1/config', routes.config);
    app.use('/api/v1/app', routes.apps);
    app.use('/api/v1/template', routes.templates);
    app.use('/api/v1/route', routes.appRoutes);
    app.use('/api/v1/shared_props', routes.sharedProps);

    app.use(errorHandler);

    app.disable('x-powered-by');

    return app;
}
