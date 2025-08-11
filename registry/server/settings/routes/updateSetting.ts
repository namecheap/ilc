import type { Request, Response } from 'express';
import Joi from 'joi';

import { User } from '../../../typings/User';
import validateRequestFactory from '../../common/services/validateRequest';
import { SettingKeys, keySchema, partialSettingSchema } from '../interfaces';
import { settingsService } from '../services/SettingsService';

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
        await settingsService.updateRootSetting(settingKey, req.body.value, user as User);
    } else {
        await settingsService.updateDomainSetting(settingKey, req.body.value, domainId, user as User);
    }
    const setting = await settingsService.getDomainMergedSetting(settingKey, domainId);
    const [backwardCompatible] = settingsService.omitEmptyAndNullValues([setting]);
    res.status(200).send(backwardCompatible);
};

export default [validateRequest, updateSetting];
