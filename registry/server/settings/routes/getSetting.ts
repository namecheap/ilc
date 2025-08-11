import type { Request, Response } from 'express';
import Joi from 'joi';

import validateRequestFactory from '../../common/services/validateRequest';
import { SettingKeys, keySchema } from '../interfaces';
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
]);

const getSetting = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const domainId = req.query.domainId ? Number(req.query.domainId) : null;
    const setting = await settingsService.getDomainMergedSetting(req.params.key, domainId);
    const [backwardCompatible] = settingsService.omitEmptyAndNullValues([setting]);

    res.status(200).send(backwardCompatible);
};

export default [validateRequest, getSetting];
