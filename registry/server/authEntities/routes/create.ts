import { RequestHandler } from 'express';

import { preProcessResponse } from '../../common/services/preProcessResponse';
import { validated } from '../../common/validation/validated';
import { createSchema } from '../interfaces';
import type { AuthEntitiesService } from '../services/AuthEntitiesService';

export function create(service: AuthEntitiesService): RequestHandler {
    return validated({ body: createSchema }, async ({ body }, req, res) => {
        const { secret, ...savedRecord } = await service.create(body, req.user);

        res.status(200).send(preProcessResponse(savedRecord));
    });
}
