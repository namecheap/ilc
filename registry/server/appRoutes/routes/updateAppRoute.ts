import { Request, Response } from 'express';
import Joi from 'joi';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import {
    prepareAppRouteSlotsToSave,
    prepareAppRouteToRespond,
    prepareAppRouteToSave,
} from '../services/prepareAppRoute';
import { partialAppRouteSchema } from '../interfaces';
import { appRouteIdSchema } from '../interfaces';
import { transformSpecialRoutesForDB } from '../services/transformSpecialRoutes';
import { routesService, RoutesService } from './RoutesService';

type UpdateAppRouteRequestParams = {
    id: string;
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
        selector: 'body',
    },
]);

const updateAppRoute = async (req: Request<UpdateAppRouteRequestParams>, res: Response) => {
    const { slots: appRouteSlots, ...appRouteData } = req.body;

    const appRouteId = +req.params.id;
    const appRoute = transformSpecialRoutesForDB(appRouteData);

    const countToUpdate = await db('routes').where('id', appRouteId);
    if (!countToUpdate.length) {
        res.status(404).send('Not found');
        return;
    }

    await db.versioning(req.user, { type: 'routes', id: appRouteId }, async (transaction) => {
        await db('routes').where('id', appRouteId).update(prepareAppRouteToSave(appRoute)).transacting(transaction);

        await db('route_slots').where('routeId', appRouteId).delete().transacting(transaction);
        await db
            .batchInsert('route_slots', prepareAppRouteSlotsToSave(appRouteSlots, appRouteId))
            .transacting(transaction);
    });

    const updatedAppRoute = await routesService.getRoutesById(appRouteId);

    res.status(200).send(prepareAppRouteToRespond(updatedAppRoute));
};

export default [validateRequestBeforeUpdateAppRoute, updateAppRoute];
