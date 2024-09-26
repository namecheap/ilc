import { Request, Response } from 'express';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import Template, { LocalizedTemplate } from '../interfaces';
import { Tables } from '../../db/structure';
import { templatesRepository } from '../services/templatesRepository';
import { templateSchema, validateLocalesAreSupported } from './validation';

const validateRequestBeforeCreateTemplate = validateRequestFactory([
    {
        schema: templateSchema,
        selector: 'body',
    },
]);

const createTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
        const request = req.body;
        const template: Template = {
            name: request.name,
            content: request.content,
        };

        const locales = Object.keys(request.localizedVersions || {});
        let localesAreValid = await validateLocalesAreSupported(locales, res);
        if (!localesAreValid) {
            return;
        }

        await db.versioning(req.user, { type: 'templates', id: template.name }, async (trx) => {
            await db('templates').insert(template).transacting(trx);
        });

        if (locales.length > 0) {
            await insertLocalizedVersions(locales, template, request);
        }

        const savedTemplate = await templatesRepository.readTemplateWithAllVersions(template.name);
        res.status(200).send(savedTemplate);
    } catch (e) {
        res.status(500).send(JSON.stringify(e));
    }
};

function insertLocalizedVersions(locales: string[], template: Template, request: Record<string, any>) {
    return Promise.all(
        locales.map((locale) => {
            const localizedTemplate: LocalizedTemplate = {
                templateName: template.name,
                content: request.localizedVersions[locale].content,
                locale: locale,
            };

            return db(Tables.TemplatesLocalized).insert(localizedTemplate);
        }),
    );
}

export default [validateRequestBeforeCreateTemplate, createTemplate];
