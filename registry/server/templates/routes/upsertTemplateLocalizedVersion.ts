import { Request, Response } from 'express';
import Joi from 'joi';
import validateRequestFactory from '../../common/services/validateRequest';
import {
    localeNameSchema,
    localizedVersionSchema,
    templateNameSchema,
    unsupportedLocalesToJoiError,
} from './validation';
import { LocalizedVersion } from '../interfaces';
import { joiErrorToResponse } from '../../util/helpers';
import { exhaustiveCheck } from 'ts-exhaustive-check';
import { templatesRepository } from '../services/templatesRepository';

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
        case 'localeNotSupported': {
            res.status(422).send(joiErrorToResponse(unsupportedLocalesToJoiError([result.locale])));
            return;
        }
        case 'ok': {
            res.status(200).send(result.localizedVersion);
            return;
        }
        default: {
            exhaustiveCheck(result);
        }
    }
};

export default [validateRequestBeforeUpsertLocalizedVersion, upsertTemplateLocalizedVersion];
