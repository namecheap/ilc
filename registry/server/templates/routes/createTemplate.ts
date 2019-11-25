import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import {
    prepareTemplateToInsert,
    prepareTemplateToRespond,
} from '../services/prepareTemplate';
import Template, {
    templateSchema,
} from '../interfaces';

const validateRequestBeforeCreateTemplate = validateRequestFactory([{
    schema: templateSchema,
    selector: _.get('body'),
}]);

const createTemplate = async (req: Request, res: Response): Promise<void> => {
    await validateRequestBeforeCreateTemplate(req, res);

    const template = req.body;

    await db('templates').insert(prepareTemplateToInsert(template));

    const [savedTemplate] = await db.select().from<Template>('templates').where('name', template.name);

    res.status(200).send(prepareTemplateToRespond(savedTemplate));
};

export default createTemplate;
