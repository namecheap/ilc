import { Request, Response } from 'express';

import validateRequestFactory from '../../common/services/validateRequest';
import db from '../../db';
import { extractInsertedId, handleForeignConstraintError } from '../../util/db';
import { defined, getJoiErr, joiErrorToResponse } from '../../util/helpers';
import { appRouteSchema } from '../interfaces';
import { prepareAppRouteSlotsToSave, prepareAppRouteToSave } from '../services/prepareAppRoute';
import { transformSpecialRoutesForDB } from '../services/transformSpecialRoutes';
import { retrieveAppRouteFromDB } from './getAppRoute';

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
            const result = await db('routes').insert(prepareAppRouteToSave(appRoute), 'id').transacting(transaction);
            savedAppRouteId = extractInsertedId(result as { id: number }[]);

            await db
                .batchInsert('route_slots', prepareAppRouteSlotsToSave(appRouteSlots, savedAppRouteId))
                .transacting(transaction);

            return savedAppRouteId;
        });
    } catch (e) {
        let { message } = e as Error;

        // error messages for uniq constraint "orderPos" and "domainId"
        const sqliteErrorOrderPos = 'UNIQUE constraint failed: routes.orderPos, routes.domainIdIdxble';
        const mysqlErrorOrderPos = 'routes_orderpos_and_domainIdIdxble_unique';

        if (message.includes(sqliteErrorOrderPos) || message.includes(mysqlErrorOrderPos)) {
            res.status(422);
            return res.send(
                joiErrorToResponse(
                    getJoiErr('route', `Specified "orderPos" value already exists for routes with provided "domainId"`),
                ),
            );
        }
        handleForeignConstraintError(e as Error);
        throw e;
    }

    const savedAppRoute = await retrieveAppRouteFromDB(defined(savedAppRouteId));

    res.status(200).send(savedAppRoute);
};

export default [validateRequestBeforeCreateAppRoute, createAppRoute];
