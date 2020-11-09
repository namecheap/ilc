import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import { sharedPropsNameSchema } from '../interfaces';

type RequestParams = {
    name: string
};

const validateRequest = validateRequestFactory([{
    schema: Joi.object({
        name: sharedPropsNameSchema.required(),
    }),
    selector: _.get('params'),
}]);

const deleteSharedProps = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    let count;
    await db.versioning(req.user, {type: 'shared_props', id: req.params.name}, async (trx) => {
        count = await db('shared_props').where('name', req.params.name).delete().transacting(trx);
    });

    if (count) {
        res.status(204).send();
    } else {
        res.status(404).send('Not found');
    }
};

export default [validateRequest, deleteSharedProps];
