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
    stringifyJSON,
} from '../../common/services/json';
import {
    partialAppRouteSchema,
} from '../interfaces';
import {
    appRouteIdSchema,
} from '../interfaces';

type UpdateAppRouteRequestParams = {
    id: string
};

const validateRequestBeforeUpdateAppRoute = validateRequestFactory([
    {
        schema: Joi.object({
            id: appRouteIdSchema.required(),
        }),
        selector: _.get('params'),
    },
    {
        schema: partialAppRouteSchema,
        selector: _.get('body')
    },
]);

const updateAppRoute = async (req: Request<UpdateAppRouteRequestParams>, res: Response) => {
    await validateRequestBeforeUpdateAppRoute(req, res);

    const {
        slots: appRouteSlots,
        ...appRoute
    } = req.body;
    const appRouteId = req.params.id;

    const appRoutes = await db.transaction(async (transaction) => {
        await db('routes').where('id', appRouteId).update(appRoute).transacting(transaction);

        if (!_.isEmpty(appRouteSlots)) {
            await db('route_slots').where('routeId', appRouteId).delete().transacting(transaction);
            await db.batchInsert('route_slots', _.compose(
                _.map((appRouteSlotName) => _.compose(
                    stringifyJSON(['props']),
                    _.assign({ name: appRouteSlotName, routeId: appRouteId }),
                    _.get(appRouteSlotName)
                )(appRouteSlots)),
                _.keys,
            )(appRouteSlots)).transacting(transaction);
        }

        const appRoutes = await db
            .select('routes.id as routeId', 'route_slots.id as routeSlotId', '*')
            .from('routes')
            .where('routeId', appRouteId)
            .join('route_slots', {
                'route_slots.routeId': 'routes.id'
            })
            .transacting(transaction);

        return appRoutes;
    });

    res.status(200).send(prepareAppRouteToRespond(appRoutes));
};

export default updateAppRoute;
