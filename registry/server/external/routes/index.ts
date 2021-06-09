import express from 'express';

import getAppsByMetadata from './getAppsByMetadata';

const externalRouter = express.Router();

externalRouter.get('/apps_by_metadata', ...getAppsByMetadata);

export default externalRouter;
