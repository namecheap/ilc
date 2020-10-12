import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';
import _ from 'lodash/fp';

import {
    SettingKeys,
    keySchema,
} from '../interfaces';
import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';

type RequestParams = {
    key: SettingKeys
};

const validateRequest = validateRequestFactory([
    {
        schema: Joi.object({
            key: keySchema.required(),
        }),
        selector: _.get('params'),
    },
]);

const getSetting = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const [setting] = await db.select().from('settings').where('key', req.params.key);
    res.status(200).send(preProcessResponse(setting));
};

export default [validateRequest, getSetting];
