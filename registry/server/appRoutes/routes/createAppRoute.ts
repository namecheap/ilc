import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import {
    stringifyJSON,
} from '../../common/services/json';
import {
    prepareAppRouteToRespond,
} from '../services/prepareAppRoute';
import {
    appRouteSchema,
} from '../interfaces';

const validateRequestBeforeCreateAppRoute = validateRequestFactory([{
    schema: appRouteSchema,
    selector: _.get('body'),
}]);

const createAppRoute = async (req: Request, res: Response) => {
    await validateRequestBeforeCreateAppRoute(req, res);

    const {
        slots: appRouteSlots,
        ...appRoute
    } = req.body;

    const savedAppRouteId = await db.transaction(async (transaction) => {
        const [appRouteId] = await db('routes').insert(appRoute).transacting(transaction);

        await db.batchInsert('route_slots', _.compose(
            _.map((appRouteSlotName) => _.compose(
                stringifyJSON(['props']),
                _.assign({ name: appRouteSlotName, routeId: appRouteId }),
                _.get(appRouteSlotName)
            )(appRouteSlots)),
            _.keys,
        )(appRouteSlots)).transacting(transaction);

        return appRouteId;
    });

    const savedAppRoute = await db
        .select('routes.id as routeId', 'route_slots.id as routeSlotId', '*')
        .from('routes')
        .where('routeId', savedAppRouteId)
        .join('route_slots', {
            'route_slots.routeId': 'routes.id'
        });

    res.status(200).send(prepareAppRouteToRespond(savedAppRoute));
};

export default createAppRoute;
