import { RequestHandler } from 'express';

import preProcessResponse from '../../common/services/preProcessResponse';
import { markProtected } from '../../common/services/protectedEntities';
import { validated } from '../../common/validation/validated';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import { routerDomainsParamsSchema } from '../interfaces';
import type { RouterDomainsService } from '../services/RouterDomainsService';

export function getRouterDomains(service: RouterDomainsService): RequestHandler {
    return validated({ params: routerDomainsParamsSchema }, async ({ params }, req, res) => {
        const routerDomains = await service.get(params.id);

        if (!routerDomains) {
            res.status(404).send('Not found');
        } else {
            const routerDomainsWithId = {
                ...routerDomains,
                versionId: appendDigest(routerDomains.versionId, 'routerDomains'),
            };
            res.status(200).send(preProcessResponse(markProtected(EntityTypes.router_domains, routerDomainsWithId)));
        }
    });
}
