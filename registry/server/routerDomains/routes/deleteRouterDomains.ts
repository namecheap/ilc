import { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { routerDomainsParamsSchema } from '../interfaces';
import type { RouterDomainsService } from '../services/RouterDomainsService';

export function deleteRouterDomains(service: RouterDomainsService): RequestHandler {
    return validated({ params: routerDomainsParamsSchema }, async ({ params }, req, res) => {
        await service.delete(params.id, req.user);

        res.status(204).send();
    });
}
