import express from 'express';

import getAppsByMetadata from './getAppsByMetadata';

const externalRouter = express.Router();

externalRouter.get('/app_discovery', ...getAppsByMetadata);

export default externalRouter;
