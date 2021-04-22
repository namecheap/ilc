import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import { routerDomainIdSchema } from '../interfaces';
import * as httpErrors from "../../errorHandler/httpErrors";

type RequestParams = {
    id: string
};

const validateRequest = validateRequestFactory([{
    schema: Joi.object({
        id: routerDomainIdSchema,
    }),
    selector: 'params',
}]);

const deleteRouterDomains = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    
    await db.versioning(req.user, { type: 'router_domains', id: req.params.id }, async (trx) => {
        let count;
        try {
            count = await db('router_domains').where('id', req.params.id).delete().transacting(trx);
        } catch (e) {
            throw new httpErrors.DBError({ message: e.message })
        }

        if (!count) {
            throw new httpErrors.NotFoundError()
        }
    });

    res.status(204).send();
};

export default [validateRequest, deleteRouterDomains];
