import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';
import * as httpErrors from '../../errorHandler/httpErrors';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import {
    sharedLibNameSchema,
} from '../interfaces';

type DeleteSharedLibRequestParams = {
    name: string,
};

const validateRequestBeforeDeleteSharedLib = validateRequestFactory([{
    schema: Joi.object({
        name: sharedLibNameSchema.required(),
    }),
    selector: 'params',
}]);

const deleteSharedLib = async (req: Request<DeleteSharedLibRequestParams>, res: Response): Promise<void> => {
    const sharedLibName = req.params.name;

    await db.versioning(req.user, { type: 'shared_libs', id: sharedLibName }, async (trx) => {
        const count = await db('shared_libs').where('name', sharedLibName).delete().transacting(trx);
        if (!count) {
            throw new httpErrors.NotFoundError()
        }
    });

    res.status(204).send();
};

export default [validateRequestBeforeDeleteSharedLib, deleteSharedLib];
