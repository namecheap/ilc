import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import * as httpErrors from '../../errorHandler/httpErrors';

type RequestParams = {
    id: string
};

const validateRequest = validateRequestFactory([{
    schema: Joi.object({
        id: Joi.number()
    }),
    selector: 'params',
}]);

const deleteRecord = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    await db.versioning(req.user, {type: 'auth_entities', id: req.params.id}, async (trx) => {
        const count = await db('auth_entities').where('id', req.params.id).delete().transacting(trx);
        if (!count) {
            throw new httpErrors.NotFoundError()
        }
    });

    res.status(204).send();
};

export default [validateRequest, deleteRecord];
