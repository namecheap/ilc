import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import SharedProps, { sharedPropsNameSchema } from '../interfaces';

type RequestParams = {
    name: string
};

const validateRequest = validateRequestFactory([{
    schema: Joi.object({
        name: sharedPropsNameSchema.required(),
    }),
    selector: _.get('params'),
}]);

const getSharedProps = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const [sharedProps] = await db.select().from<SharedProps>('shared_props').where('name', req.params.name);

    if (!sharedProps) {
        res.status(404).send('Not found');
    } else {
        res.status(200).send(preProcessResponse(sharedProps));
    }
};

export default [validateRequest, getSharedProps];
