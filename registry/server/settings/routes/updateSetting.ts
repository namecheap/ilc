import type { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { partialSettingSchema, settingParamsSchema } from '../interfaces';
import type { SettingsService } from '../services/SettingsService';

export function updateSetting(settingsService: SettingsService): RequestHandler {
    return validated(
        { params: settingParamsSchema, body: partialSettingSchema },
        async ({ params, body }, req, res) => {
            const settingKey = params.key;
            const { domainId } = body;

            const user = req.user;

            if (!domainId) {
                await settingsService.updateRootSetting(settingKey, body.value, user);
            } else {
                await settingsService.updateDomainSetting(settingKey, body.value, domainId, user);
            }
            const setting = await settingsService.getDomainMergedSetting(settingKey, domainId);
            const [backwardCompatible] = settingsService.omitEmptyAndNullValues([setting]);
            res.status(200).send(backwardCompatible);
        },
    );
}
