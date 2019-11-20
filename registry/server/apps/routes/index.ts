import express from 'express';

import getApps from './getApps';
import updateApp, { validateAppBeforeUpdate } from './updateApp';
import createApps, { validateAppsBeforeCreate } from './createApps';
import deleteApps, { validateAppsBeforeDelete } from './deleteApps';

const appsRouter = express.Router();

appsRouter.get('/', getApps);
appsRouter.put('/', validateAppBeforeUpdate, updateApp);
appsRouter.post('/', validateAppsBeforeCreate, createApps);
appsRouter.delete('/', validateAppsBeforeDelete, deleteApps);

export default appsRouter;
