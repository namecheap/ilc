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
    try {
        await validateRequestBeforeDeleteTemplate(req, res);
    } catch(err) {
        res.status(422).send(err);
        return;
    }

    const {
        name: templateName,
    } = req.params;

    const count = await db('templates').where('name', templateName).delete();

    if (count) {
        res.status(204).send();
    } else {
        res.status(404).send('Not found');
    }
};

export default deleteTemplate;
