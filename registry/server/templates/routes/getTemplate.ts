import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

import db from '../../db';
import Template, {
    TemplateName,
    templateNameSchema,
} from '../interfaces';
import validateRequest, {
    selectParamsToValidate,
} from '../../common/services/validateRequest';
import {
    prepareTemplateToRespond,
} from '../services/prepareTemplate';

type GetTemplateRequestParams = {
    name: TemplateName
};

const validateRequestBeforeGetTemplate = validateRequest(new Map([
    [Joi.object({
        name: templateNameSchema.required(),
    }), selectParamsToValidate],
]));

const getTemplate = async (req: Request<GetTemplateRequestParams>, res: Response): Promise<void> => {
    await validateRequestBeforeGetTemplate(req, res);

    const {
        name: templateName,
    } = req.params;

    const [template] = await db.select().from<Template>('templates').where('name', templateName);

    res.status(200).send(prepareTemplateToRespond(template));
};

export default getTemplate;
