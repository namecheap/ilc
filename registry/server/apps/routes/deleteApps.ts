import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

import db from '../../db';
import validationMiddleware, { ValidationPairs, selectBodyToValidate } from '../../common/middlewares/validationMiddleware';
import { AppName, appNameSchema } from '../interfaces/App';

type DeleteAppsRequestBody = Array<AppName>;

const deleteApps = async (req: Request, res: Response) => {
    const appsNames: DeleteAppsRequestBody = req.body;

    await db('apps').whereIn('name', appsNames).delete();

    return res.status(200).send();
};

const deleteAppsRequestBodySchema = Joi.array().items(appNameSchema).min(1).required();
const deleteAppsValidationPairs: ValidationPairs = new Map([
    [deleteAppsRequestBodySchema, selectBodyToValidate],
]);

export const validateAppsBeforeDelete = validationMiddleware(deleteAppsValidationPairs);

export default deleteApps;
