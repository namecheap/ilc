import { Request, Response } from 'express';

import db from '../../db';
import preProcessResponse from '../services/preProcessResponse';
import { AllowedSettingKeysForDomains } from '../interfaces';

const getSettings = async (req: Request, res: Response): Promise<void> => {
    const filters =
        req.query.filter && typeof req.query.filter === 'string' ? JSON.parse(req.query.filter as string) : {};

    const range = req.query.range && typeof req.query.range === 'string' ? req.query.range : undefined;

    const query = db.select().from('settings');

    if (filters && filters.enforceDomain) {
        const enforceDomain = Number(filters.enforceDomain);
        query
            .innerJoin('settings_domain_value', 'settings.key', 'settings_domain_value.key')
            .where('settings_domain_value.domainId', filters.enforceDomain)
            .select('settings.*', 'settings_domain_value.value as value', 'settings_domain_value.domainId as domainId');
    } else {
        query.where('router_domain_id', null);
    }

    const settings = await query.range(range);

    if (filters && filters.allowedForDomains) {
        settings.data = settings.data.filter((setting: { key: any }) => {
            return AllowedSettingKeysForDomains.includes(setting.key);
        });
    }

    res.setHeader('Content-Range', settings.pagination.total);
    res.status(200).send(preProcessResponse(settings.data));
};

export default [getSettings];
