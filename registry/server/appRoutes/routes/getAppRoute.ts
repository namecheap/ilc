import { Request, Response } from 'express';
import Joi from 'joi';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import { prepareAppRouteToRespond } from '../services/prepareAppRoute';
import { appRouteIdSchema } from '../interfaces';
import { transformSpecialRoutesForConsumer } from '../services/transformSpecialRoutes';

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

const getAppRoute = async (req: Request<GetAppRouteRequestParams>, res: Response) => {
    const data = await retrieveAppRouteFromDB(+req.params.id);

    if (data) {
        res.status(200).send(data);
    } else {
        res.status(404).send('Not found');
    }

};

export default [validateRequestBeforeGetAppRoute, getAppRoute];
