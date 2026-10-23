import { RequestHandler } from 'express';

import preProcessResponse from '../../common/services/preProcessResponse';
import { validated } from '../../common/validation/validated';
import { routerDomainsParamsSchema, routerDomainsSchema } from '../interfaces';
import type { RouterDomainsService } from '../services/RouterDomainsService';

export function updateRouterDomains(service: RouterDomainsService): RequestHandler {
    return validated(
        { params: routerDomainsParamsSchema, body: routerDomainsSchema },
        async ({ params, body }, req, res) => {
            const updatedRouterDomains = await service.update(params.id, body, req.user);

            res.status(200).send(preProcessResponse(updatedRouterDomains));
        },
    );
}
