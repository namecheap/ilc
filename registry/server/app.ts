require('./util/express-promise');

// import path from 'path';
// import config from 'config';
import express from 'express';

import pong from './util/ping';
import * as routes from "./routes";

//production use 2+ instances of the registry with help of "npm run assetsdiscovery" and run manualy
process.env.NODE_ENV !== 'production' && require('./runnerAppAssetsDiscovery');

const app = express();

app.get('/ping', () => pong);

app.get('/', (req, res) => res.send('Hello! This is Micro Fragments registry service.'));
app.use('/api/v1/config', routes.config);


app.disable('x-powered-by');

export default app;
