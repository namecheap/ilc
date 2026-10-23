import { RequestHandler } from 'express';

import preProcessResponse from '../../common/services/preProcessResponse';
import { validated } from '../../common/validation/validated';
import { routerDomainsSchema } from '../interfaces';
import type { RouterDomainsService } from '../services/RouterDomainsService';

export function createRouterDomains(service: RouterDomainsService): RequestHandler {
    return validated({ body: routerDomainsSchema }, async ({ body }, req, res) => {
        const savedRouterDomains = await service.create(body, req.user);

        res.status(200).send(preProcessResponse(savedRouterDomains));
    });
}
