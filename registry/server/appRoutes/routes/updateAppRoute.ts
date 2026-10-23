import { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { prepareAppRouteToRespond } from '../services/prepareAppRoute';
import { appRouteParamsSchema, partialAppRouteSchema } from '../interfaces';
import type { RoutesService } from '../services/RoutesService';

export function updateAppRoute(service: RoutesService): RequestHandler {
    return validated(
        { params: appRouteParamsSchema, body: partialAppRouteSchema },
        async ({ params, body }, req, res) => {
            await service.update(params.id, body, req.user);

            const updatedAppRoute = await service.getRoutesById(params.id);

            res.status(200).send(prepareAppRouteToRespond(updatedAppRoute));
        },
    );
}
