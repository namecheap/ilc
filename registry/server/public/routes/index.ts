import express from 'express';

import appDiscovery from './appDiscovery';

const externalRouter = express.Router();

externalRouter.get('/app_discovery', ...appDiscovery);

export default externalRouter;
