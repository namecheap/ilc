import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';
import _ from 'lodash/fp';

import {
    SettingKeys,
    keySchema,
    partialSettingSchema,
} from '../interfaces';
import db from '../../db';
import preProcessResponse from '../services/preProcessResponse';
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
    {
        schema: partialSettingSchema,
        selector: _.get('body')
    },
]);

const updateSetting = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const settingKey = req.params.key;

    await db.versioning(req.user, {type: 'settings', id: settingKey}, async (trx) => {
        await db('settings')
            .where('key', settingKey)
            .update('value', JSON.stringify(req.body.value))
            .transacting(trx);
    });
    
    const [updated] = await db.select().from('settings').where('key', settingKey);
    res.status(200).send(preProcessResponse(updated));
};

export default [validateRequest, updateSetting];
