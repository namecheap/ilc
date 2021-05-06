import { Request, Response } from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import { stringifyJSON } from '../../common/services/json';
import { prepareAppRouteToSave } from '../services/prepareAppRoute';
import { appRouteSchema } from '../interfaces';
import * as httpErrors from '../../errorHandler/httpErrors';
import { retrieveAppRouteFromDB } from './getAppRoute';
import { transformSpecialRoutesForDB } from '../services/transformSpecialRoutes';
import {getJoiErr, joiErrorToResponse} from '../../util/helpers';

const validateRequestBeforeCreateAppRoute = validateRequestFactory([{
    schema: appRouteSchema,
    selector: 'body',
}]);

const createAppRoute = async (req: Request, res: Response) => {
    const {
        slots: appRouteSlots,
        ...appRouteData
    } = req.body;

    const appRoute = transformSpecialRoutesForDB(appRouteData);

    let savedAppRouteId: number;

    try {
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
    } catch (e) {
        let { message } = e;

        // error messages for uniq constraint "route" and "domainId"
        const sqliteErrorRoute = 'UNIQUE constraint failed: routes.route, routes.domainIdIdxble';
        const mysqlErrorRoute = 'routes_route_and_domainIdIdxble_unique';

        if (message.includes(sqliteErrorRoute) || message.includes(mysqlErrorRoute)) {
            res.status(422);
            if (appRouteData.specialRole) {
                return res.send(joiErrorToResponse(
                    getJoiErr('specialRole', `"specialRole" "${appRouteData.specialRole}" for provided "domainId" already exists`)
                ));
            } else {
                return res.send(joiErrorToResponse(
                    getJoiErr('route', `Specified "route" value already exists`)
                ));
            }
        }

        // error messages for uniq constraint "orderPos" and "domainId"
        const sqliteErrorOrderPos = 'UNIQUE constraint failed: routes.orderPos, routes.domainIdIdxble';
        const mysqlErrorOrderPos = 'routes_orderpos_and_domainIdIdxble_unique';

        if (message.includes(sqliteErrorOrderPos) || message.includes(mysqlErrorOrderPos)) {
            res.status(422);
            return res.send(joiErrorToResponse(
                getJoiErr('route', `Specified "orderPos" value already exists for routes with provided "domainId"`)
            ));
        }

        if (['foreign key constraint fails', 'FOREIGN KEY constraint failed'].some(v => message.includes(v))) {
            throw new httpErrors.DBError({ message })
        }

        throw e;
    }

    const savedAppRoute = await retrieveAppRouteFromDB(savedAppRouteId!);

    res.status(200).send(savedAppRoute);
};

export default [validateRequestBeforeCreateAppRoute, createAppRoute];
