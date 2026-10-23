import { RequestHandler } from 'express';

import { markProtected, routeEntity } from '../../common/services/protectedEntities';
import { validated } from '../../common/validation/validated';
import { appendDigest } from '../../util/hmac';
import { appRoutesFiltersSchema, appRoutesListQuerySchema } from '../interfaces';
import { prepareAppRoutesToRespond } from '../services/prepareAppRoute';
import { transformSpecialRoutesForConsumer } from '../services/transformSpecialRoutes';
import type { RoutesService } from '../services/RoutesService';

export function getAppRoutes(service: RoutesService): RequestHandler {
    return validated(
        { filters: appRoutesFiltersSchema, query: appRoutesListQuerySchema },
        async ({ filters, query }, req, res) => {
            const appRoutes = await service.list(filters, query.range);
            const itemsWithId = appRoutes.data.map((item) => {
                return { ...item, versionId: appendDigest(item.versionId, 'route') };
            });
            const appRoutesResponse = transformSpecialRoutesForConsumer(itemsWithId);

            res.setHeader('Content-Range', appRoutes.pagination.total); //Stub for future pagination capabilities
            const preparedRoutes = prepareAppRoutesToRespond(appRoutesResponse).map((route) =>
                markProtected(routeEntity(route), route),
            );

            res.status(200).send(preparedRoutes);
        },
    );
}
