import { Request, Response } from 'express';
import Joi from 'joi';

import { SettingKeys, keySchema, createSettingSchema, AllowedSettingKeysForDomains } from '../interfaces';
import db from '../../db';
import preProcessResponse from '../services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';

type RequestParams = {
    id: string;
};

const validateRequest = validateRequestFactory([
    {
        schema: Joi.object({
            id: Joi.number().required(),
        }),
        selector: 'params',
    },
]);

const deleteSettingForDomain = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const id = req.params.id;
    await db('settings_domain_value').where({ id }).delete();
    res.status(204).send();
};

export default [validateRequest, deleteSettingForDomain];
