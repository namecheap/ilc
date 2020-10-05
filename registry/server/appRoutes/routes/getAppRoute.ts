import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';
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
    const appRouteId = req.params.id;

    const appRoutes = await db
        .select('routes.id as routeId', 'route_slots.id as routeSlotId', 'routes.*', 'route_slots.*')
        .from('routes')
        .where('routeId', appRouteId)
        .join('route_slots', {
            'route_slots.routeId': 'routes.id'
        });

    if (appRoutes.length) {
        const data = prepareAppRouteToRespond(appRoutes);
        if (data.specialRole) {
            data.specialRole = data.specialRole.toString();
        }
        if (data.templateName) {
            data.templateName = data.templateName.toString();
        }
        res.status(200).send(data);
    } else {
        res.status(404).send('Not found');
    }

};

export default [validateRequestBeforeGetAppRoute, getAppRoute];
