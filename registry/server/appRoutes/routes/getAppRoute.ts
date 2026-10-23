import { RequestHandler } from 'express';

import { markProtected, routeEntity } from '../../common/services/protectedEntities';
import { validated } from '../../common/validation/validated';
import { prepareAppRouteToRespond } from '../services/prepareAppRoute';
import { appRouteParamsSchema } from '../interfaces';
import { transformSpecialRoutesForConsumer } from '../services/transformSpecialRoutes';
import type { RoutesService } from '../services/RoutesService';

export const retrieveAppRouteFromDB = async (service: RoutesService, appRouteId: number) => {
    const appRoutes = await service.getRoutesById(appRouteId);

    if (!appRoutes.length) {
        return;
    }

    const preparedRoutes = prepareAppRouteToRespond(appRoutes);
    const transformedRoutes = transformSpecialRoutesForConsumer(preparedRoutes);
    if (transformedRoutes.templateName) {
        transformedRoutes.templateName = transformedRoutes.templateName.toString();
    }

    return transformedRoutes;
};

export function getAppRoute(service: RoutesService): RequestHandler {
    return validated({ params: appRouteParamsSchema }, async ({ params }, req, res) => {
        const data = await retrieveAppRouteFromDB(service, params.id);

        if (data) {
            res.status(200).send(markProtected(routeEntity(data), data));
        } else {
            res.status(404).send('Not found');
        }
    });
}
