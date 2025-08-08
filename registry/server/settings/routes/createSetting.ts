import type { Request, Response } from 'express';

import { User } from '../../../typings/User';
import validateRequestFactory from '../../common/services/validateRequest';
import { SettingKeys, createSettingSchema } from '../interfaces';
import settingsService from '../services/SettingsService';

type RequestParams = {
    key: SettingKeys;
};

const validateRequest = validateRequestFactory([
    {
        schema: createSettingSchema,
        selector: 'body',
    },
]);

const createSettingForDomain = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const settingKey = req.body.key;
    const domainId = req.body.domainId;

    const savedSetting = await settingsService.createSettingForDomain(
        settingKey,
        req.body.value,
        domainId,
        req.user as User,
    );
    res.status(200).send(savedSetting);
};

export default [validateRequest, createSettingForDomain];
