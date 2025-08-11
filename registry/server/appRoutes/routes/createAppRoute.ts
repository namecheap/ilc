import { Request, Response } from 'express';

import validateRequestFactory from '../../common/services/validateRequest';
import db from '../../db';
import { extractInsertedId, handleForeignConstraintError } from '../../util/db';
import { defined, getJoiErr, joiErrorToResponse } from '../../util/helpers';
import { appRouteSchema } from '../interfaces';
import { prepareAppRouteSlotsToSave, prepareAppRouteToSave } from '../services/prepareAppRoute';
import { transformSpecialRoutesForDB } from '../services/transformSpecialRoutes';
import { retrieveAppRouteFromDB } from './getAppRoute';
import { routesService } from './RoutesService';

const validateRequestBeforeCreateAppRoute = validateRequestFactory([
    {
        schema: appRouteSchema,
        selector: 'body',
    },
]);

const createAppRoute = async (req: Request, res: Response) => {
    const { slots: appRouteSlots, ...appRouteData } = req.body;

    const appRoute = transformSpecialRoutesForDB(appRouteData);

    if (appRouteData.specialRole) {
        const existingRoute = await db.first().from('routes').where({
            route: appRoute.route,
            domainId: appRoute.domainId,
        });

        if (existingRoute !== undefined) {
            return res
                .status(422)
                .send(
                    joiErrorToResponse(
                        getJoiErr(
                            'specialRole',
                            `"specialRole" "${appRouteData.specialRole}" for provided "domainId" already exists`,
                        ),
                    ),
                );
        }
    }

    let savedAppRouteId: number | undefined;

    try {
        await db.versioning(req.user, { type: 'routes' }, async (transaction) => {
            const appRouteRecord = prepareAppRouteToSave(appRoute);
            if (appRouteRecord.orderPos === undefined) {
                appRouteRecord.orderPos = await routesService.getNextOrderPos(
                    appRouteRecord.domainId ?? null,
                    transaction,
                );
            }
            const result = await db('routes').insert(appRouteRecord, 'id').transacting(transaction);
            savedAppRouteId = extractInsertedId(result);

            await db
                .batchInsert('route_slots', prepareAppRouteSlotsToSave(appRouteSlots, savedAppRouteId))
                .transacting(transaction);

            return savedAppRouteId;
        });
    } catch (error) {
        if (routesService.isOrderPosError(error)) {
            res.status(422);
            return res.send(
                joiErrorToResponse(
                    getJoiErr(
                        'orderPos',
                        `Specified "orderPos" value already exists for routes with provided "domainId"`,
                    ),
                ),
            );
        }
        handleForeignConstraintError(error as Error);
        throw error;
    }

    const savedAppRoute = await retrieveAppRouteFromDB(defined(savedAppRouteId));

    res.status(200).send(savedAppRoute);
};

export default [validateRequestBeforeCreateAppRoute, createAppRoute];
