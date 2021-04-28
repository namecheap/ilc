import { Request, Response } from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import { stringifyJSON } from '../../common/services/json';
import { prepareAppRouteToSave } from '../services/prepareAppRoute';
import { appRouteSchema } from '../interfaces';
import * as httpErrors from '../../errorHandler/httpErrors';
import { retrieveAppRouteFromDB } from './getAppRoute';

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

        // error messages for uniq constraint specialRole and domainId
        const sqliteError = 'UNIQUE constraint failed: routes.specialRole, routes.domainId';
        const mysqlError = 'routes_specialrole_and_domainId_unique';

        if (message.includes(sqliteError) || message.includes(mysqlError)) {
            message = `SpecialRole "${req.body.specialRole}" for provided DomainId "${req.body.domainId}" already exists`;
        }
        throw new httpErrors.DBError({ message })
    }

    const savedAppRoute = await retrieveAppRouteFromDB(savedAppRouteId!);

    res.status(200).send(savedAppRoute);
};

export default [validateRequestBeforeCreateAppRoute, createAppRoute];
