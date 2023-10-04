import { Request, Response } from 'express';
import Joi from 'joi';

import { SettingKeys, keySchema, createSettingSchema, AllowedSettingKeysForDomains } from '../interfaces';
import db from '../../db';
import preProcessResponse from '../services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import { extractInsertedId } from '../../util/db';

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
    let payload = req.body;

    if (!AllowedSettingKeysForDomains.includes(settingKey)) {
        res.status(422).send(`Setting key ${settingKey} is not allowed for domains`);
        return;
    }

    const [{ total }] = await db
        .from<{ total: string | number }>('router_domains')
        .count('id as total')
        .where('id', domainId);

    if (Number(total) === 0) {
        res.status(422).send(`Domain with id ${domainId} does not exist`);
        return;
    }

    payload.value = JSON.stringify(payload.value);
    const result = await db('settings_domain_value').insert(payload, 'id');
    const id = extractInsertedId(result);

    const [savedSetting] = await db.select().from('settings_domain_value').where('id', id);
    res.status(200).send(savedSetting);
};

export default [validateRequest, createSettingForDomain];
