import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import {
    prepareAppRouteToRespond,
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

const getAppRoute = async (req: Request<GetAppRouteRequestParams>, res: Response) => {
    try {
        await validateRequestBeforeGetAppRoute(req, res);
    } catch(err) {
        res.status(422).send(err);
        return;
    }

    const appRouteId = req.params.id;

    const appRoutes = await db
        .select('routes.id as routeId', 'route_slots.id as routeSlotId', '*')
        .from('routes')
        .where('routeId', appRouteId)
        .join('route_slots', {
            'route_slots.routeId': 'routes.id'
        });

    if (appRoutes.length) {
        res.status(200).send(prepareAppRouteToRespond(appRoutes));
    } else {
        res.status(404).send('Not found');
    }

};

export default getAppRoute;
