import { Request, Response } from 'express';

import db from '../../db';
import preProcessResponse from '../services/preProcessResponse';
import { AllowedSettingKeysForDomains } from '../interfaces';
import settingsService from '../services/SettingsService';

const parseFilters = (
    filter: unknown,
): { allowedForDomains: boolean | null; enforceDomain: number | null; domainName: string | null } => {
    if (typeof filter !== 'string') {
        return {
            allowedForDomains: null,
            enforceDomain: null,
            domainName: null,
        };
    }

    const filters = filter ? JSON.parse(filter) : {};

    return {
        allowedForDomains: filters.allowedForDomains ? Boolean(filters.allowedForDomains) : null,
        enforceDomain: filters.enforceDomain ? Number(filters.enforceDomain) : null,
        domainName: filters.domainName ? filters.domainName : null,
    };
};

const getSettings = async (req: Request, res: Response): Promise<void> => {
    const filters = parseFilters(req.query.filter);
    const range = req.query.range && typeof req.query.range === 'string' ? req.query.range : undefined;
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

    return;
};

export default [getSettings];
