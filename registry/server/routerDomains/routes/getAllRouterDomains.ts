import { RequestHandler } from 'express';

import { preProcessResponse } from '../../common/services/preProcessResponse';
import { markProtected } from '../../common/services/protectedEntities';
import { validated } from '../../common/validation/validated';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import { routerDomainsListQuerySchema } from '../interfaces';
import type { RouterDomainsService } from '../services/RouterDomainsService';

export function getAllRouterDomains(service: RouterDomainsService): RequestHandler {
    return validated({ query: routerDomainsListQuerySchema }, async ({ query }, req, res) => {
        const routerDomains = await service.list(query.range);
        const itemsWithId = routerDomains.data.map((item) => {
            return { ...item, versionId: appendDigest(item.versionId, 'routerDomains') };
        });
        res.setHeader('Content-Range', routerDomains.pagination.total);
        res.status(200).send(preProcessResponse(markProtected(EntityTypes.router_domains, itemsWithId)));
    });
}
