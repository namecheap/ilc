import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

import db from '../../db';
import Template, {
    templateNameSchema,
} from '../interfaces';
import validateRequestFactory from '../../common/services/validateRequest';

type GetTemplateRequestParams = {
    name: string
};

const validateRequestBeforeGetTemplate = validateRequestFactory([{
    schema: Joi.object({
        name: templateNameSchema.required(),
    }),
    selector: _.get('params'),
}]);

const getTemplate = async (req: Request<GetTemplateRequestParams>, res: Response): Promise<void> => {
    await validateRequestBeforeGetTemplate(req, res);

    const {
        name: templateName,
    } = req.params;

    const [template] = await db.select().from<Template>('templates').where('name', templateName);

    res.status(200).send(template);
};

export default getTemplate;
