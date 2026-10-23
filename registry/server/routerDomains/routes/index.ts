import express, { RequestHandler, Router } from 'express';

import type { RouterDomainsService } from '../services/RouterDomainsService';
import { getRouterDomains } from './getRouterDomains';
import { getAllRouterDomains } from './getAllRouterDomains';
import { updateRouterDomains } from './updateRouterDomains';
import { createRouterDomains } from './createRouterDomains';
import { deleteRouterDomains } from './deleteRouterDomains';

export function createRouterDomainsRouter(service: RouterDomainsService, authMw: RequestHandler[]): Router {
    const routerDomainsRouter = express.Router();

    routerDomainsRouter.get('/', getAllRouterDomains(service));
    routerDomainsRouter.post('/', authMw, createRouterDomains(service));
    routerDomainsRouter.get('/:id', authMw, getRouterDomains(service));
    routerDomainsRouter.put('/:id', authMw, updateRouterDomains(service));
    routerDomainsRouter.delete('/:id', authMw, deleteRouterDomains(service));

    return routerDomainsRouter;
}
