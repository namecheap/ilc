import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

import db from '../../db';
import AppRoute from '../interfaces';
import validateRequestFactory from '../../common/services/validateRequest';
import {
    prepareAppRoutesToRespond,
} from '../services/prepareAppRoute';
import {
    appRouteIdSchema,
} from '../interfaces';

type GetAppRouteRequestParams = {
    id: string
};

const validateRequestBeforeGetAppRoute = validateRequestFactory([{
    schema: Joi.object({
        id: appRouteIdSchema,
    }),
    selector: _.get('params'),
}]);

const getAppRoute = async (req: Request<GetAppRouteRequestParams>, res: Response): Promise<void> => {
    await validateRequestBeforeGetAppRoute(req, res);

    const appRouteId = req.params.id;

    const appRoutes = await db
        .select('routes.id as routeId', '*')
        .from<AppRoute>('routes')
        .where('routeId', appRouteId)
        .join('route_slots', {
            'route_slots.routeId': 'routes.id'
        });
    const [appRoute] = prepareAppRoutesToRespond(appRoutes);

    res.status(200).send(appRoute);
};

export default getAppRoute;
