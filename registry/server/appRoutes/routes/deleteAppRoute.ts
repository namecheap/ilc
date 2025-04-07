import { Request, Response } from 'express';
import Joi from 'joi';
import * as httpErrors from '../../errorHandler/httpErrors';

import validateRequestFactory from '../../common/services/validateRequest';
import db from '../../db';
import { Tables } from '../../db/structure';
import { appRouteIdSchema } from '../interfaces';
import { makeSpecialRoute } from '../services/transformSpecialRoutes';

type DeleteAppRouteRequestParams = {
    id: string;
};

const validateRequestBeforeDeleteAppRoute = validateRequestFactory([
    {
        schema: Joi.object({
            id: appRouteIdSchema,
        }),
        selector: 'params',
    },
]);

const deleteAppRoute = async (req: Request<DeleteAppRouteRequestParams>, res: Response) => {
    const [default404Route] = await db(Tables.Routes)
        .select()
        .where({ route: makeSpecialRoute('404'), domainId: null });

    const appRouteId = req.params.id;

    if (default404Route?.id === Number(appRouteId)) {
        throw new httpErrors.CustomError({
            message: "Default 404 error can't be deleted",
        });
    }

    await db.versioning(req.user, { type: 'routes', id: appRouteId }, async (transaction) => {
        const count = await db('routes').where('id', appRouteId).delete().transacting(transaction);
        if (!count) {
            throw new httpErrors.NotFoundError();
        }
    });

    res.status(204).send();
};

export default [validateRequestBeforeDeleteAppRoute, deleteAppRoute];
