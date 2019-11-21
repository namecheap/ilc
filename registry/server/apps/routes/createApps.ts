import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import validationMiddleware, { ValidationPairs, selectBodyToValidate } from '../../common/middlewares/validationMiddleware';
import preProcessResponse from '../../common/services/preProcessResponse';
import prepareAppsToInsert from '../services/prepareAppsToInsert';
import App, { AppBody } from '../interfaces/App';
import appsBodySchema from '../schemas/apps';

type CreateAppsRequestBody = Array<AppBody>;

const selectAppsNames = _.map<AppBody, string>(_.get('name'));

const createApps = async (req: Request, res: Response) => {
    const apps: CreateAppsRequestBody = req.body;

    await db.batchInsert('apps', prepareAppsToInsert(apps));

    const appsNames: Array<string> = selectAppsNames(apps);
    const savedApps: Array<App> = await db.select().from<App>('apps').whereIn('name', appsNames);

    return res.status(200).send(preProcessResponse(savedApps));
};

const createAppsRequestBodySchema = appsBodySchema.min(1);
const createAppsValidationPairs: ValidationPairs = new Map([
    [createAppsRequestBodySchema, selectBodyToValidate],
]);

export const validateAppsBeforeCreate = validationMiddleware(createAppsValidationPairs);

export default createApps;
