import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';
import * as httpErrors from '../../errorHandler/httpErrors';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import { templateNameSchema } from './validation';

type DeleteTemplateRequestParams = {
    name: string
};

const validateRequestBeforeDeleteTemplate = validateRequestFactory([{
    schema: Joi.object({
        name: templateNameSchema.required(),
    }),
    selector: 'params',
}]);

const deleteTemplate = async (req: Request<DeleteTemplateRequestParams>, res: Response): Promise<void> => {
    const {
        name: templateName,
    } = req.params;

    await db.versioning(req.user, {type: 'templates', id: templateName}, async (trx) => {
        const count = await db('templates').where('name', templateName).delete().transacting(trx);
        if (!count) {
            throw new httpErrors.NotFoundError();
        }
    });

    res.status(204).send();
};

export default [validateRequestBeforeDeleteTemplate, deleteTemplate];
