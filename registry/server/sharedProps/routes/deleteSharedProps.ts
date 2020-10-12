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
    const count = await db('shared_props').where('name', req.params.name).delete();

    if (count) {
        res.status(204).send();
    } else {
        res.status(404).send('Not found');
    }
};

export default [validateRequest, deleteSharedProps];
