import { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { authEntityParamsSchema } from '../interfaces';
import type { AuthEntitiesService } from '../services/AuthEntitiesService';

export function deleteRoute(service: AuthEntitiesService): RequestHandler {
    return validated({ params: authEntityParamsSchema }, async ({ params }, req, res) => {
        await service.delete(params.id, req.user);

        res.status(204).send();
    });
}
