import express from 'express';

import getApps from './getApps';
import updateApp from './updateApp';
import createApps from './createApps';
import deleteApps from './deleteApps';

const appsRouter = express.Router();

appsRouter.get('/', getApps);
appsRouter.put('/', updateApp);
appsRouter.post('/', createApps);
appsRouter.delete('/', deleteApps);

export default appsRouter;
