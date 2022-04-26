import {NextFunction, Request, Response} from 'express';
import Joi from 'joi';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import { prepareAppRouteToRespond } from '../services/prepareAppRoute';
import { appRouteIdSchema } from '../interfaces';
import { transformSpecialRoutesForConsumer } from '../services/transformSpecialRoutes';
import { patchRoute } from "../services/dataPatch";
import { domainRestrictionGuard } from '../guards';

type GetAppRouteRequestParams = {
    id: string
};

const validateRequestBeforeGetAppRoute = validateRequestFactory([{
    schema: Joi.object({
        id: appRouteIdSchema,
    }),
    selector: 'params',
}]);

export const retrieveAppRouteFromDB = async (appRouteId: number) => {
    const appRoutes = await db
        .select('routes.id as routeId', 'route_slots.id as routeSlotId', 'routes.*', 'route_slots.*')
        .from('routes')
        .where('routeId', appRouteId)
        .join('route_slots', {
            'route_slots.routeId': 'routes.id'
        });

    if (!appRoutes.length) {
        return;
    }


    let data = prepareAppRouteToRespond(appRoutes);
    data = transformSpecialRoutesForConsumer(data);
    if (data.templateName) {
        data.templateName = data.templateName.toString();
    }

    return data;
};

const getAppRoute = async (req: Request<GetAppRouteRequestParams>, res: Response, next: NextFunction) => {
    const data = await retrieveAppRouteFromDB(+req.params.id);

    if(!data) {
        res.status(404).send('Not found');
        return next();
    }

    try {
        const domainName = req.hostname;
        const route = await patchRoute(data);
        const guard = domainRestrictionGuard(domainName);
        const isAllowed = guard(route);

        isAllowed ? res.status(200).send(route) : (
            res.status(403).send('Forbidden')
        );
    } catch({ message }) {
        res.status(500);
    }

    next();
}

export default [validateRequestBeforeGetAppRoute, getAppRoute];
