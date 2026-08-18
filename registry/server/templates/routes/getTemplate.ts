import { Request, Response } from 'express';
import Joi from 'joi';

import { markProtected } from '../../common/services/protectedEntities';
import validateRequestFactory from '../../common/services/validateRequest';
import { EntityTypes } from '../../versioning/interfaces';
import { templatesRepository } from '../services/templatesRepository';
import { templateNameSchema } from './validation';

type GetTemplateRequestParams = {
    name: string;
};

const validateRequestBeforeGetTemplate = validateRequestFactory([
    {
        schema: Joi.object({
            name: templateNameSchema.required(),
        }),
        selector: 'params',
    },
]);

const getTemplate = async (req: Request<GetTemplateRequestParams>, res: Response): Promise<void> => {
    const { name: templateName } = req.params;

    const template = await templatesRepository.readTemplateWithAllVersions(templateName);

    if (!template) {
        res.status(404).send('Not found');
        return;
    }

    res.status(200).send(markProtected(EntityTypes.templates, template));
};

export default [validateRequestBeforeGetTemplate, getTemplate];
