import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequest, {
    selectBodyToValidate,
    selectParamsToValidate,
} from '../../common/services/validateRequest';
import {
    prepareTemplateToInsert,
    prepareTemplateToRespond,
} from '../services/prepareTemplate';
import Template, {
    TemplateName,
    templateNameSchema,
    partialTemplateBodySchema,
} from '../interfaces';

type UpdateTemplateRequestParams = {
    name: TemplateName
};

const validateRequestBeforeUpdateTemplate = validateRequest(new Map([
    [Joi.object({
        name: templateNameSchema.required(),
    }), selectParamsToValidate],
    [partialTemplateBodySchema, selectBodyToValidate],
]));

const updateTemplate = async (req: Request<UpdateTemplateRequestParams>, res: Response): Promise<void> => {
    await validateRequestBeforeUpdateTemplate(req, res);

    const template = req.body;
    const {
        name: templateName
    } = req.params;

    await db('templates').where({ name: templateName }).update(prepareTemplateToInsert(template));

    const [updatedTemplate] = await db.select().from<Template>('templates').where('name', templateName);

    res.status(200).send(prepareTemplateToRespond(updatedTemplate));
};

export default updateTemplate;
