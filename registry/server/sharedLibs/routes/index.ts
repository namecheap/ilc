import express, { Router } from 'express';

import type { SharedLibsService } from '../services/SharedLibsService';
import { getSharedLib } from './getSharedLib';
import { getSharedLibs } from './getSharedLibs';
import { updateSharedLib } from './updateSharedLib';
import { createSharedLib } from './createSharedLib';
import { deleteSharedLib } from './deleteSharedLib';

export function createSharedLibsRouter(service: SharedLibsService): Router {
    const SharedLibsRouter = express.Router();

    SharedLibsRouter.get('/', getSharedLibs(service));
    SharedLibsRouter.post('/', createSharedLib(service));
    SharedLibsRouter.get('/:name', getSharedLib(service));
    SharedLibsRouter.put('/:name', updateSharedLib(service));
    SharedLibsRouter.delete('/:name', deleteSharedLib(service));

    return SharedLibsRouter;
}
