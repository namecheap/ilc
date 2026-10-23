import type { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { versionsFiltersSchema, versionsListQuerySchema } from '../interfaces';
import type { Versioning } from '../services/Versioning';

export function getVersions(versioning: Versioning): RequestHandler {
    return validated(
        { filters: versionsFiltersSchema, query: versionsListQuerySchema },
        async ({ filters, query }, req, res) => {
            const dbRes = await versioning.listVersions(filters, query.range);
            const result = dbRes.data.map((x) => ({ ...x, created_at: new Date(x.created_at).toISOString() }));

            res.setHeader('Content-Range', dbRes.pagination.total); //Stub for future pagination capabilities
            res.status(200).send(result);
        },
    );
}
