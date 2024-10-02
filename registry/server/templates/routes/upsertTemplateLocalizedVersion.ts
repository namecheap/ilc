import { Request, Response } from 'express';
import Joi from 'joi';

import validateRequestFactory from '../../common/services/validateRequest';
import { validateLocalesMiddleware } from '../../middleware/validatelocales';
import { exhaustiveCheck } from '../../util/exhaustiveCheck';
import { LocalizedVersion } from '../interfaces';
import { templatesRepository } from '../services/templatesRepository';
import { localeNameSchema, localizedVersionSchema, templateNameSchema } from './validation';

const validateRequestBeforeUpsertLocalizedVersion = validateRequestFactory([
    {
        schema: Joi.object({
            name: templateNameSchema.required(),
            locale: localeNameSchema.required(),
        }),
        selector: 'params',
    },
    {
        schema: localizedVersionSchema.required(),
        selector: 'body',
    },
]);

const validateLocale = validateLocalesMiddleware(
    (req) => [req.params.locale],
    () => 'params.locale',
);

type Params = {
    name: string;
    locale: string;
};

const upsertTemplateLocalizedVersion = async (
    req: Request<Params, any, LocalizedVersion>,
    res: Response,
): Promise<void> => {
    const { name: templateName, locale } = req.params;
    const localizedVersion = req.body;

    const result = await templatesRepository.upsertLocalizedVersion(templateName, locale, localizedVersion);
    switch (result.type) {
        case 'notFound': {
            res.status(404).send('Not found');
            return;
        }
        case 'ok': {
            res.status(200).send(result.localizedVersion);
            return;
        }
        default: {
            /* istanbul ignore next */
            exhaustiveCheck(result);
        }
    }
};

export default [validateRequestBeforeUpsertLocalizedVersion, validateLocale, upsertTemplateLocalizedVersion];
