import { RequestHandler } from 'express';

import preProcessResponse from '../../common/services/preProcessResponse';
import { validated } from '../../common/validation/validated';
import { authEntityParamsSchema, updateSchema } from '../interfaces';
import type { AuthEntitiesService } from '../services/AuthEntitiesService';

export function update(service: AuthEntitiesService): RequestHandler {
    return validated({ params: authEntityParamsSchema, body: updateSchema }, async ({ params, body }, req, res) => {
        const { secret, ...updatedRecord } = await service.update(params.id, body, req.user);

        res.status(200).send(preProcessResponse(updatedRecord));
    });
}
