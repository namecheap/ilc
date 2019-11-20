import express from 'express';

import getApps from './getApps';

const appsRouter = express.Router();

appsRouter.get('/', getApps);

export default appsRouter;
