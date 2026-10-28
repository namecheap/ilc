import { RequestHandler } from 'express';

import { preProcessResponse } from '../../common/services/preProcessResponse';
import { markProtected } from '../../common/services/protectedEntities';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import type { AuthEntitiesService } from '../services/AuthEntitiesService';

export function getAll(service: AuthEntitiesService): RequestHandler {
    return async (req, res) => {
        const records = await service.list();
        const authEntities = records.map(({ secret, ...v }) => {
            return markProtected(EntityTypes.auth_entities, {
                ...v,
                versionId: appendDigest(v.versionId, 'authEntities'),
            });
        });

        res.setHeader('Content-Range', authEntities.length); //Stub for future pagination capabilities
        res.status(200).send(preProcessResponse(authEntities));
    };
}
