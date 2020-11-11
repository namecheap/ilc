import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';
import _ from 'lodash/fp';
import * as httpErrors from '../../errorHandler/httpErrors';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import {
    appNameSchema,
} from '../interfaces';

type DeleteAppRequestParams = {
    name: string,
};

const validateRequestBeforeDeleteApp = validateRequestFactory([{
    schema: Joi.object({
        name: appNameSchema.required(),
    }),
    selector: _.get('params'),
}]);

const deleteApp = async (req: Request<DeleteAppRequestParams>, res: Response): Promise<void> => {
    const appName = req.params.name;

    await db.versioning(req.user, {type: 'apps', id: appName}, async (trx) => {
        const count = await db('apps').where('name', appName).delete().transacting(trx);
        if (!count) {
            throw new httpErrors.NotFoundError()
        }
    });

    res.status(204).send();
};

export default [validateRequestBeforeDeleteApp, deleteApp];
