import { RequestHandler } from 'express';

import { preProcessResponse } from '../../common/services/preProcessResponse';
import { markProtected } from '../../common/services/protectedEntities';
import { validated } from '../../common/validation/validated';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import { appsFiltersSchema, appsListQuerySchema } from '../interfaces';
import type { AppsService } from '../services/AppsService';

export function getApps(service: AppsService): RequestHandler {
    return validated(
        { filters: appsFiltersSchema, query: appsListQuerySchema },
        async ({ filters, query }, req, res) => {
            const { data, pagination } = await service.list(filters, query.range);
            const itemsWithId = data.map((item) => {
                return { ...item, versionId: appendDigest(item.versionId, 'app') };
            });

            res.setHeader('Content-Range', pagination.total); //Stub for future pagination capabilities
            res.status(200).send(preProcessResponse(markProtected(EntityTypes.apps, itemsWithId)));
        },
    );
}
