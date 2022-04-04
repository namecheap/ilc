import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import {
    templateNameSchema,
    partialTemplateSchema,
} from '../interfaces';
import { readTemplateWithAllVersions, upsertLocalizedVersions } from '../services/templatesRepository';

type UpdateTemplateRequestParams = {
    name: string
};

const validateRequestBeforeUpdateTemplate = validateRequestFactory([
    {
        schema: Joi.object({
            name: templateNameSchema.required(),
        }),
        selector: 'params',
    },
    {
        schema: partialTemplateSchema,
        selector: 'body',
    },
]);

const updateTemplate = async (req: Request<UpdateTemplateRequestParams>, res: Response): Promise<void> => {
    const template = {
        content: req.body.content
    };
    const templateName = req.params.name;

    const templatesToUpdate = await db('templates').where({ name: templateName });
    if (!templatesToUpdate.length) {
        res.status(404).send('Not found');
        return;
    }

    const localizedVersions = req.body.localizedVersions || {};
    await db.versioning(req.user, {type: 'templates', id: templateName}, async (trx) => {
        await db('templates').where({ name: templateName }).update(template).transacting(trx);
        await upsertLocalizedVersions(templateName, localizedVersions, trx);
    });

    const updatedTemplate = await readTemplateWithAllVersions(templateName);
    res.status(200).send(updatedTemplate);
};

export default [validateRequestBeforeUpdateTemplate, updateTemplate];
