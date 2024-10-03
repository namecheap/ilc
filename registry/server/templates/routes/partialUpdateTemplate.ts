import { Request, Response } from 'express';
import Joi from 'joi';

import validateRequestFactory from '../../common/services/validateRequest';
import { validateLocalesMiddleware } from '../../middleware/validatelocales';
import { exhaustiveCheck } from '../../util/exhaustiveCheck';
import { templatesRepository } from '../services/templatesRepository';
import { commonTemplate, templateNameSchema } from './validation';

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
        schema: Joi.object({
            content: commonTemplate.content.required(),
        }),
        selector: 'body',
    },
]);

const partialUpdateTemplate = async (req: Request<UpdateTemplateRequestParams>, res: Response): Promise<void> => {
    const result = await templatesRepository.partialUpdateTemplate(req.params.name, req.body, req.user);

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
            /* istanbul ignore next */
            exhaustiveCheck(result);
        }
    }
};

export default [validateRequestBeforeUpdateTemplate, partialUpdateTemplate];
