require('./util/express-promise');

// import path from 'path';
// import config from 'config';
import express from 'express';
import bodyParser from 'body-parser';

import pong from './util/ping';
import * as routes from "./routes";

//TODO: should be moved to separate CLI command in order to work with 2+ instances of the registry
import AppAssetsDiscovery from './common/services/AppAssetsDiscovery';
new AppAssetsDiscovery().start();

const app = express();

app.use(bodyParser.json())

app.get('/ping', () => pong);

app.get('/', (req, res) => res.send('Hello! This is Micro Fragments registry service.'));
app.use('/api/v1/config', routes.config);
app.use('/api/v1/app', routes.apps);


app.disable('x-powered-by');

export default app;
