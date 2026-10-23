import type { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { domainSettingParamsSchema } from '../interfaces';
import type { SettingsService } from '../services/SettingsService';

export function deleteDomainSetting(settingsService: SettingsService): RequestHandler {
    return validated({ params: domainSettingParamsSchema }, async ({ params }, req, res) => {
        await settingsService.deleteDomainSetting(params.id);
        res.status(204).send();
    });
}
