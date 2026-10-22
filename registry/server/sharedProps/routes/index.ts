import express, { Router } from 'express';

import type { SharedPropsService } from '../services/SharedPropsService';
import { getSharedProps } from './getSharedProps';
import { getAllSharedProps } from './getAllSharedProps';
import { updateSharedProps } from './updateSharedProps';
import { createSharedProps } from './createSharedProps';
import { deleteSharedProps } from './deleteSharedProps';

export function createSharedPropsRouter(service: SharedPropsService): Router {
    const sharedPropsRouter = express.Router();

    sharedPropsRouter.get('/', getAllSharedProps(service));
    sharedPropsRouter.post('/', createSharedProps(service));
    sharedPropsRouter.get('/:name', getSharedProps(service));
    sharedPropsRouter.put('/:name', updateSharedProps(service));
    sharedPropsRouter.delete('/:name', deleteSharedProps(service));

    return sharedPropsRouter;
}
