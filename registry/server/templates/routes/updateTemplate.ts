import { ok } from 'assert';
import { Request, Response } from 'express';
import Joi from 'joi';

import validateRequestFactory from '../../common/services/validateRequest';
import { exhaustiveCheck } from '../../util/exhaustiveCheck';
import { joiErrorToResponse } from '../../util/helpers';
import { templatesRepository } from '../services/templatesRepository';
import { partialTemplateSchema, templateNameSchema, unsupportedLocalesToJoiError } from './validation';

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

const updateTemplate = async (req: Request<UpdateTemplateRequestParams>, res: Response): Promise<void> => {
    ok(req.user);
    const result = await templatesRepository.updateTemplate(req.params.name, req.body, req.user);

    switch (result.type) {
        case 'notFound': {
            res.status(404).send('Not found');
            return;
        }
        case 'localeNotSupported': {
            res.status(422).send(joiErrorToResponse(unsupportedLocalesToJoiError(result.locales)));
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

export default [validateRequestBeforeUpdateTemplate, updateTemplate];
