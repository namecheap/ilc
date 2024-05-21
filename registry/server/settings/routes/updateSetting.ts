import { Request, Response } from 'express';
import Joi from 'joi';

import { SettingKeys, keySchema, partialSettingSchema } from '../interfaces';
import db from '../../db';
import preProcessResponse from '../services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import settingService from '../services/SettingsService';
import { User } from '../../../typings/User';

type RequestParams = {
    key: SettingKeys;
};

const validateRequest = validateRequestFactory([
    {
        schema: Joi.object({
            key: keySchema.required(),
        }),
        selector: 'params',
    },
    {
        schema: partialSettingSchema,
        selector: 'body',
    },
]);

const updateSetting = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const settingKey = req.params.key;
    const { domainId } = req.body;

    const user = req.user;

    if (!domainId) {
        const updatedRecord = await settingService.updateRootSetting(settingKey, req.body.value, user as User);
        res.status(200).send(preProcessResponse(updatedRecord));
        return;
    } else {
        const updatedRecord = await settingService.updateDomainSetting(
            settingKey,
            req.body.value,
            domainId,
            user as User,
        );
        res.status(200).send(preProcessResponse(updatedRecord));
        return;
    }
};

export default [validateRequest, updateSetting];
