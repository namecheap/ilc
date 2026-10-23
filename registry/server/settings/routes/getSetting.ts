import type { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { settingParamsSchema, settingQuerySchema } from '../interfaces';
import type { SettingsService } from '../services/SettingsService';

export function getSetting(settingsService: SettingsService): RequestHandler {
    return validated(
        { params: settingParamsSchema, query: settingQuerySchema },
        async ({ params, query }, req, res) => {
            const domainId = query.domainId || null;
            const setting = await settingsService.getDomainMergedSetting(params.key, domainId);
            const [backwardCompatible] = settingsService.omitEmptyAndNullValues([setting]);

            res.status(200).send(backwardCompatible);
        },
    );
}
