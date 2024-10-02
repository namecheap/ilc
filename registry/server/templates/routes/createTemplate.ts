import { Request, Response } from 'express';

import validateRequestFactory from '../../common/services/validateRequest';
import { templatesRepository } from '../services/templatesRepository';
import { templateSchema } from './validation';
import { validateLocalesMiddleware } from '../../middleware/validatelocales';

const validateRequestBeforeCreateTemplate = validateRequestFactory([
    {
        schema: templateSchema,
        selector: 'body',
    },
]);

const validateLocale = validateLocalesMiddleware(
    (req) => Object.keys(req.body.localizedVersions ?? {}),
    (unsupportedLocales) => `body.localizedVersions.${unsupportedLocales[0]}`,
);

const createTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await templatesRepository.createTemplate(req.body, req.user);
        res.status(200).send(result);
    } catch (e) {
        res.status(500).send(JSON.stringify(e));
    }
};

export default [validateRequestBeforeCreateTemplate, validateLocale, createTemplate];
