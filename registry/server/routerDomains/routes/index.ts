import express from 'express';

import getRouterDomains from './getRouterDomains';
import getAllRouterDomains from './getAllRouterDomains';
import updateRouterDomains from './updateRouterDomains';
import createRouterDomains from './createRouterDomains';
import deleteRouterDomains from './deleteRouterDomains';

const routerDomainsRouter = express.Router();

routerDomainsRouter.get('/', ...getAllRouterDomains);
routerDomainsRouter.post('/', ...createRouterDomains);
routerDomainsRouter.get('/:id', ...getRouterDomains);
routerDomainsRouter.put('/:id', ...updateRouterDomains);
routerDomainsRouter.delete('/:id', ...deleteRouterDomains);

export default routerDomainsRouter;
