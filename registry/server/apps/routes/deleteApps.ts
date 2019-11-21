import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequest, {
    ValidationPairs,
    selectBodyToValidate,
} from '../../common/services/validateRequest';
import {
    AppName,
    appNameSchema,
} from '../interfaces/App';

type DeleteAppsRequestBody = Array<AppName>;

const deleteAppsRequestBodySchema = Joi.array().items(appNameSchema).min(1).required();
const deleteAppsValidationPairs: ValidationPairs = new Map([
    [deleteAppsRequestBodySchema, selectBodyToValidate],
]);

const validateAppsBeforeDelete = validateRequest(deleteAppsValidationPairs);

const deleteApps = async (req: Request, res: Response): Promise<void> => {
    await validateAppsBeforeDelete(req, res);

    const appsNames: DeleteAppsRequestBody = req.body;

    await db('apps').whereIn('name', appsNames).delete();

    res.status(200).send();
};

export default deleteApps;
