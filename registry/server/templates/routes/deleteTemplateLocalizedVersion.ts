import { Request, Response } from 'express';
import Joi from 'joi';

import validateRequestFactory from '../../common/services/validateRequest';
import { exhaustiveCheck } from '../../util/exhaustiveCheck';
import { templatesRepository } from '../services/templatesRepository';
import { localeNameSchema, templateNameSchema } from './validation';

const validateRequestBeforeDeleteTemplateLocalizedVersion = validateRequestFactory([
    {
        schema: Joi.object({
            name: templateNameSchema.required(),
            locale: localeNameSchema.required(),
        }),
        selector: 'params',
    },
]);

type Params = {
    name: string;
    locale: string;
};

const deleteTemplateLocalizedVersion = async (req: Request<Params>, res: Response): Promise<void> => {
    const { name: templateName, locale } = req.params;

    const result = await templatesRepository.deleteLocalizedVersion(templateName, locale);
    switch (result.type) {
        case 'notFound': {
            res.status(404).send('Not found');
            return;
        }
        case 'ok': {
            res.status(204).send();
            return;
        }
        default: {
            /* istanbul ignore next */
            exhaustiveCheck(result);
        }
    }
};

export default [validateRequestBeforeDeleteTemplateLocalizedVersion, deleteTemplateLocalizedVersion];
