import express, { Router } from 'express';

import type { RoutesService } from '../services/RoutesService';
import { getAppRoute } from './getAppRoute';
import { getAppRoutes } from './getAppRoutes';
import { updateAppRoute } from './updateAppRoute';
import { createAppRoute } from './createAppRoute';
import { deleteAppRoute } from './deleteAppRoute';

export function createAppRoutesRouter(service: RoutesService): Router {
    const appRoutesRouter = express.Router();

    appRoutesRouter.get('/', getAppRoutes(service));
    appRoutesRouter.get('/:id', getAppRoute(service));
    appRoutesRouter.post('/', createAppRoute(service));
    appRoutesRouter.put('/:id', updateAppRoute(service));
    appRoutesRouter.delete('/:id', deleteAppRoute(service));

    return appRoutesRouter;
}
