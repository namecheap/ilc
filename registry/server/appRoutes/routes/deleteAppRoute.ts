import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequest, {
    selectParamsToValidate,
} from '../../common/services/validateRequest';

type DeleteAppRouteRequestParams = {
    id: string
};

const validateRequestBeforeDeleteAppRoute = validateRequest(new Map([
    [Joi.object({
        id: Joi.string().trim().required(),
    }), selectParamsToValidate],
]));

const deleteAppRoute = async (req: Request<DeleteAppRouteRequestParams>, res: Response): Promise<void> => {
    await validateRequestBeforeDeleteAppRoute(req, res);

    const {
        id: appRouteId,
    } = req.params;

    await db('routes').where('id', appRouteId).delete();
    await db('route_slots').where('routeId', appRouteId).delete();

    res.status(200).send();
};

export default deleteAppRoute;
