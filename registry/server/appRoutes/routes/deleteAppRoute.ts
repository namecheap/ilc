import { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { appRouteParamsSchema } from '../interfaces';
import type { RoutesService } from '../services/RoutesService';

export function deleteAppRoute(service: RoutesService): RequestHandler {
    return validated({ params: appRouteParamsSchema }, async ({ params }, req, res) => {
        await service.delete(params.id, req.user);

        res.status(204).send();
    });
}
