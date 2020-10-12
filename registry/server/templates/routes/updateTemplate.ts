import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import Template, {
    templateNameSchema,
    partialTemplateSchema,
} from '../interfaces';

type UpdateTemplateRequestParams = {
    name: string
};

const validateRequestBeforeUpdateTemplate = validateRequestFactory([
    {
        schema: Joi.object({
            name: templateNameSchema.required(),
        }),
        selector: _.get('params'),
    },
    {
        schema: partialTemplateSchema,
        selector: _.get('body'),
    },
]);

const updateTemplate = async (req: Request<UpdateTemplateRequestParams>, res: Response): Promise<void> => {
    const template = req.body;
    const templateName = req.params.name;

    const templatesToUpdate = await db('templates').where({ name: templateName });
    if (!templatesToUpdate.length) {
        res.status(404).send('Not found');
        return;
    }

    await db('templates').where({ name: templateName }).update(template);

    const [updatedTemplate] = await db.select().from<Template>('templates').where('name', templateName);

    res.status(200).send(updatedTemplate);
};

export default [validateRequestBeforeUpdateTemplate, updateTemplate];
