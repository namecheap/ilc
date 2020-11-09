import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';
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
    const appRouteId = req.params.id;

    let count;
    await db.versioning(req.user, {type: 'routes', id: appRouteId}, async (transaction) => {
        await db('route_slots').where('routeId', appRouteId).delete().transacting(transaction);
        count = await db('routes').where('id', appRouteId).delete().transacting(transaction);
    });

    if (count) {
        res.status(204).send();
    } else {
        res.status(404).send('Not found');
    }
};

export default [validateRequestBeforeDeleteAppRoute, deleteAppRoute];
