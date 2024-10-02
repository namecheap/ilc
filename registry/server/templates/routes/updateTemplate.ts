import { Request, Response } from 'express';
import Joi from 'joi';

import validateRequestFactory from '../../common/services/validateRequest';
import { validateLocalesMiddleware } from '../../middleware/validatelocales';
import { exhaustiveCheck } from '../../util/exhaustiveCheck';
import { templatesRepository } from '../services/templatesRepository';
import { partialTemplateSchema, templateNameSchema } from './validation';

type UpdateTemplateRequestParams = {
    name: string;
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

const validateLocale = validateLocalesMiddleware(
    (req) => Object.keys(req.body.localizedVersions ?? {}),
    (unsupportedLocales) => `body.localizedVersions.${unsupportedLocales[0]}`,
);

const updateTemplate = async (req: Request<UpdateTemplateRequestParams>, res: Response): Promise<void> => {
    const result = await templatesRepository.updateTemplate(req.params.name, req.body, req.user);

    switch (result.type) {
        case 'notFound': {
            res.status(404).send('Not found');
            return;
        }
        case 'ok': {
            res.status(200).send(result.template);
            return;
        }
        default: {
            exhaustiveCheck(result);
        }
    }
};

export default [validateRequestBeforeUpdateTemplate, validateLocale, updateTemplate];
