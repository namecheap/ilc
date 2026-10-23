import express, { Router } from 'express';

import type { AppsService } from '../services/AppsService';
import { getApp } from './getApp';
import { getApps } from './getApps';
import { updateApp } from './updateApp';
import { createApp } from './createApp';
import { deleteApp } from './deleteApp';

export function createAppsRouter(service: AppsService): Router {
    const appsRouter = express.Router();

    appsRouter.get('/', getApps(service));
    appsRouter.post('/', createApp(service));
    appsRouter.get('/:name', getApp(service));
    appsRouter.put('/:name', updateApp(service));
    appsRouter.delete('/:name', deleteApp(service));

    return appsRouter;
}
