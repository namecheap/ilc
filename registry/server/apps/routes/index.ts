import express from 'express';

import getApp from './getApp';
import getApps from './getApps';
import updateApp from './updateApp';
import createApp from './createApp';
import deleteApp from './deleteApp';

const appsRouter = express.Router();

appsRouter.get('/', getApps);
appsRouter.post('/', createApp);
appsRouter.get('/:name', getApp);
appsRouter.put('/:name', updateApp);
appsRouter.delete('/:name', deleteApp);

export default appsRouter;
