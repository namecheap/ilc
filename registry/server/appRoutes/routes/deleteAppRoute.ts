import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import {
    appRouteIdSchema,
} from '../interfaces';

type DeleteAppRouteRequestParams = {
    id: string
};

const validateRequestBeforeDeleteAppRoute = validateRequestFactory([{
    schema: Joi.object({
        id: appRouteIdSchema,
    }),
    selector: _.get('params'),
}]);

const deleteAppRoute = async (req: Request<DeleteAppRouteRequestParams>, res: Response) => {
    await validateRequestBeforeDeleteAppRoute(req, res);

    const appRouteId = req.params.id;

    await db.transaction(async (transaction) => {
        try {
            await db('routes').where('id', appRouteId).delete().transacting(transaction);
            await db('route_slots').where('routeId', appRouteId).delete().transacting(transaction);

            return transaction.commit();
        } catch (error) {
            await transaction.rollback();
        }
    });

    res.status(200).send();
};

export default deleteAppRoute;
