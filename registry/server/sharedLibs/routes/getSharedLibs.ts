import { RequestHandler } from 'express';

import { preProcessResponse } from '../../common/services/preProcessResponse';
import { markProtected } from '../../common/services/protectedEntities';
import { validated } from '../../common/validation/validated';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import { sharedLibsFiltersSchema, sharedLibsListQuerySchema } from '../interfaces';
import type { SharedLibsService } from '../services/SharedLibsService';

export function getSharedLibs(service: SharedLibsService): RequestHandler {
    return validated(
        { filters: sharedLibsFiltersSchema, query: sharedLibsListQuerySchema },
        async ({ filters, query }, req, res) => {
            const { data, pagination } = await service.list(filters, query.range);
            const sharedLibs = data.map((item) => {
                return { ...item, versionId: appendDigest(item.versionId, 'sharedLib') };
            });

            res.setHeader('Content-Range', pagination.total);
            res.status(200).send(preProcessResponse(markProtected(EntityTypes.shared_libs, sharedLibs)));
        },
    );
}
