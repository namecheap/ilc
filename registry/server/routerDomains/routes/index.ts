import express, { RequestHandler } from 'express';

import getRouterDomains from './getRouterDomains';
import getAllRouterDomains from './getAllRouterDomains';
import updateRouterDomains from './updateRouterDomains';
import createRouterDomains from './createRouterDomains';
import deleteRouterDomains from './deleteRouterDomains';

export default (authMw: RequestHandler) => {
    const routerDomainsRouter = express.Router();

    routerDomainsRouter.get('/', ...getAllRouterDomains);
    routerDomainsRouter.post('/', authMw, ...createRouterDomains);
    routerDomainsRouter.get('/:id', authMw, ...getRouterDomains);
    routerDomainsRouter.put('/:id', authMw, ...updateRouterDomains);
    routerDomainsRouter.delete('/:id', authMw, ...deleteRouterDomains);

    return routerDomainsRouter;
};
