import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import {
    templateNameSchema,
} from '../interfaces';

type DeleteTemplateRequestParams = {
    name: string
};

const validateRequestBeforeDeleteTemplate = validateRequestFactory([{
    schema: Joi.object({
        name: templateNameSchema.required(),
    }),
    selector: _.get('params'),
}]);

const deleteTemplate = async (req: Request<DeleteTemplateRequestParams>, res: Response): Promise<void> => {
    await validateRequestBeforeDeleteTemplate(req, res);

    const {
        name: templateName,
    } = req.params;

    await db('templates').where('name', templateName).delete();

    res.status(200).send();
};

export default deleteTemplate;
