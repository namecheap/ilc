import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';
import _ from 'lodash/fp';

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

    const count = await db('apps').where('name', appName).delete();

    if (count) {
        res.status(204).send();
    } else {
        res.status(404).send('Not found');
    }
};

export default [validateRequestBeforeDeleteApp, deleteApp];
