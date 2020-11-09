import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';

type RequestParams = {
    id: string
};

const validateRequest = validateRequestFactory([{
    schema: Joi.object({
        id: Joi.number()
    }),
    selector: _.get('params'),
}]);

const deleteRecord = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    let count;
    await db.versioning(req.user, {type: 'auth_entities', id: req.params.id}, async (trx) => {
        count = await db('auth_entities').where('id', req.params.id).delete().transacting(trx);
    });

    if (count) {
        res.status(204).send();
    } else {
        res.status(404).send('Not found');
    }
};

export default [validateRequest, deleteRecord];
