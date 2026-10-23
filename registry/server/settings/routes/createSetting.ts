import type { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { createSettingSchema } from '../interfaces';
import type { SettingsService } from '../services/SettingsService';

export function createSetting(settingsService: SettingsService): RequestHandler {
    return validated({ body: createSettingSchema }, async ({ body }, req, res) => {
        const savedSetting = await settingsService.createSettingForDomain(
            body.key,
            body.value,
            body.domainId,
            req.user,
        );
        res.status(200).send(savedSetting);
    });
}
