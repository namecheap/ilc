import type { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { settingsFiltersSchema, settingsListQuerySchema } from '../interfaces';
import type { SettingsService } from '../services/SettingsService';

export function getSettings(settingsService: SettingsService): RequestHandler {
    return validated(
        { filters: settingsFiltersSchema, query: settingsListQuerySchema },
        async ({ filters, query }, req, res) => {
            const { range } = query;
            let settings;

            if (filters.enforceDomain) {
                settings = await settingsService.getSettingsForDomainById(filters.enforceDomain, {
                    range,
                    allowedForDomains: filters.allowedForDomains,
                });
            } else if (filters.domainName) {
                settings = await settingsService.getSettingsForDomainByName(filters.domainName, {
                    range,
                    allowedForDomains: filters.allowedForDomains,
                });
            } else {
                settings = await settingsService.getSettingsForRootDomain({
                    range,
                    allowedForDomains: filters.allowedForDomains,
                });
            }

            res.setHeader('Content-Range', settings.pagination.total);
            res.status(200).send(settingsService.omitEmptyAndNullValues(settings.data));
        },
    );
}
