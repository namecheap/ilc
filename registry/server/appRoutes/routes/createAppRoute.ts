import { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { appRouteSchema } from '../interfaces';
import type { RoutesService } from '../services/RoutesService';
import { retrieveAppRouteFromDB } from './getAppRoute';

export function createAppRoute(service: RoutesService): RequestHandler {
    return validated({ body: appRouteSchema }, async ({ body }, req, res) => {
        const savedAppRouteId = await service.create(body, req.user);

        const savedAppRoute = await retrieveAppRouteFromDB(service, savedAppRouteId);

        res.status(200).send(savedAppRoute);
    });
}
