import express from 'express';

import getApps from './getApps';
import createApps from './createApps';
import deleteApps from './deleteApps';
import updateApp from './updateApp';

const appsRouter = express.Router();

appsRouter.get('/', getApps);
appsRouter.put('/', updateApp);
appsRouter.post('/', createApps);
appsRouter.delete('/', deleteApps);

export default appsRouter;
