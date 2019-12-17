import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import Template, {
    templateSchema,
} from '../interfaces';

const validateRequestBeforeCreateTemplate = validateRequestFactory([{
    schema: templateSchema,
    selector: _.get('body'),
}]);

const createTemplate = async (req: Request, res: Response): Promise<void> => {
    const template = req.body;

    await db('templates').insert(template);

    const [savedTemplate] = await db.select().from<Template>('templates').where('name', template.name);

    res.status(200).send(savedTemplate);
};

export default [validateRequestBeforeCreateTemplate, createTemplate];
