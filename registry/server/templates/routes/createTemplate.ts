import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequest, {
    selectBodyToValidate,
} from '../../common/services/validateRequest';
import {
    prepareTemplateToInsert,
    prepareTemplateToRespond,
} from '../services/prepareTemplate';
import Template, {
    templateBodySchema,
} from '../interfaces';

const validateRequestBeforeCreateTemplate = validateRequest(new Map([
    [templateBodySchema, selectBodyToValidate],
]));

const createTemplate = async (req: Request, res: Response): Promise<void> => {
    await validateRequestBeforeCreateTemplate(req, res);

    const template = req.body;

    await db('templates').insert(prepareTemplateToInsert(template));

    const [savedTemplate] = await db.select().from<Template>('templates').where('name', template.name);

    res.status(200).send(prepareTemplateToRespond(savedTemplate));
};

export default createTemplate;
