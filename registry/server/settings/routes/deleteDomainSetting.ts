import type { Request, Response } from 'express';
import Joi from 'joi';

import validateRequestFactory from '../../common/services/validateRequest';
import { settingsService } from '../services/SettingsService';

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
    await settingsService.deleteDomainSetting(id);
    res.status(204).send();
};

export default [validateRequest, deleteSettingForDomain];
