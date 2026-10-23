import express, { Router } from 'express';

import type { AuthEntitiesService } from '../services/AuthEntitiesService';
import { get } from './get';
import { getAll } from './getAll';
import { update } from './update';
import { create } from './create';
import { deleteRoute } from './deleteRoute';

export function createAuthEntitiesRouter(service: AuthEntitiesService): Router {
    const router = express.Router();

    router.get('/', getAll(service));
    router.post('/', create(service));
    router.get('/:id', get(service));
    router.put('/:id', update(service));
    router.delete('/:id', deleteRoute(service));

    return router;
}
