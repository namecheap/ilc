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
    prepareAppRouteToSave,
} from '../services/prepareAppRoute';
import {
    appRouteSchema,
} from '../interfaces';

const validateRequestBeforeCreateAppRoute = validateRequestFactory([{
    schema: appRouteSchema,
    selector: 'body',
}]);

const createAppRoute = async (req: Request, res: Response) => {
    const {
        slots: appRouteSlots,
        ...appRoute
    } = req.body;

    let savedAppRouteId: number;

    await db.versioning(req.user, { type: 'routes' }, async (transaction) => {
        [savedAppRouteId] = await db('routes').insert(prepareAppRouteToSave(appRoute)).transacting(transaction);

        await db.batchInsert('route_slots', _.compose(
            _.map((appRouteSlotName) => _.compose(
                stringifyJSON(['props']),
                _.assign({ name: appRouteSlotName, routeId: savedAppRouteId }),
                _.get(appRouteSlotName)
            )(appRouteSlots)),
            _.keys,
        )(appRouteSlots)).transacting(transaction);

        return savedAppRouteId;
    });

    const savedAppRoute = await db
        .select('routes.id as routeId', 'route_slots.id as routeSlotId', 'routes.*', 'route_slots.*')
        .from('routes')
        .where('routeId', savedAppRouteId!)
        .join('route_slots', {
            'route_slots.routeId': 'routes.id'
        });

    res.status(200).send(prepareAppRouteToRespond(savedAppRoute));
};

export default [validateRequestBeforeCreateAppRoute, createAppRoute];
