import { RequestHandler } from 'express';

import { preProcessResponse } from '../../common/services/preProcessResponse';
import { markProtected } from '../../common/services/protectedEntities';
import { validated } from '../../common/validation/validated';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import { authEntityParamsSchema } from '../interfaces';
import type { AuthEntitiesService } from '../services/AuthEntitiesService';

export function get(service: AuthEntitiesService): RequestHandler {
    return validated({ params: authEntityParamsSchema }, async ({ params }, req, res) => {
        const record = await service.get(params.id);

        if (!record) {
            res.status(404).send('Not found');
        } else {
            const { secret, ...recordWithoutSecret } = record;
            const recordWithId = {
                ...recordWithoutSecret,
                versionId: appendDigest(record.versionId, 'authEntities'),
            };
            res.status(200).send(preProcessResponse(markProtected(EntityTypes.auth_entities, recordWithId)));
        }
    });
}
