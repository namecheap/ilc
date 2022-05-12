import { Request, Response } from 'express';
import Joi from 'joi';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import { prepareAppRouteToRespond, prepareAppRouteToSave } from '../services/prepareAppRoute';
import { stringifyJSON } from '../../common/services/json';
import { partialAppRouteSchema } from '../interfaces';
import { appRouteIdSchema } from '../interfaces';
import { transformSpecialRoutesForDB } from '../services/transformSpecialRoutes';
import { getRoutesById } from './routesRepository';

type UpdateAppRouteRequestParams = {
    id: string
};

const validateRequestBeforeUpdateAppRoute = validateRequestFactory([
    {
        schema: Joi.object({
            id: appRouteIdSchema.required(),
        }),
        selector: 'params',
    },
    {
        schema: partialAppRouteSchema,
        selector: 'body'
    },
]);

const updateAppRoute = async (req: Request<UpdateAppRouteRequestParams>, res: Response) => {
    const {
        slots: appRouteSlots,
        ...appRouteData
    } = req.body;

    const appRouteId = +req.params.id;
    const appRoute = transformSpecialRoutesForDB(appRouteData);

    const countToUpdate = await db('routes').where('id', appRouteId);
    if (!countToUpdate.length) {
        res.status(404).send('Not found');
        return;
    }

    await db.versioning(req.user, {type: 'routes', id: appRouteId}, async (transaction) => {
        await db('routes').where('id', appRouteId).update(prepareAppRouteToSave(appRoute)).transacting(transaction);

        await db('route_slots').where('routeId', appRouteId).delete().transacting(transaction);
        await db.batchInsert('route_slots', _.compose(
            _.map((appRouteSlotName) => _.compose(
                stringifyJSON(['props']),
                _.assign({ name: appRouteSlotName, routeId: appRouteId }),
                _.get(appRouteSlotName)
            )(appRouteSlots)),
            _.keys,
        )(appRouteSlots)).transacting(transaction);
    });

    const updatedAppRoute = await getRoutesById(appRouteId);

    res.status(200).send(prepareAppRouteToRespond(updatedAppRoute));
};

export default [validateRequestBeforeUpdateAppRoute, updateAppRoute];
