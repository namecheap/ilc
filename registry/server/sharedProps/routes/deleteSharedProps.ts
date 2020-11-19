import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import { sharedPropsNameSchema } from '../interfaces';
import * as httpErrors from "../../errorHandler/httpErrors";

type RequestParams = {
    name: string
};

const validateRequest = validateRequestFactory([{
    schema: Joi.object({
        name: sharedPropsNameSchema.required(),
    }),
    selector: 'params',
}]);

const deleteSharedProps = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    await db.versioning(req.user, {type: 'shared_props', id: req.params.name}, async (trx) => {
        const count = await db('shared_props').where('name', req.params.name).delete().transacting(trx);
        if (!count) {
            throw new httpErrors.NotFoundError()
        }
    });

    res.status(204).send();
};

export default [validateRequest, deleteSharedProps];
