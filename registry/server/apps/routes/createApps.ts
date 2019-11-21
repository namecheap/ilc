import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequest, {
    ValidationPairs,
    selectBodyToValidate,
} from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import prepareAppsToInsert from '../services/prepareAppsToInsert';
import App, {
    AppBody,
    appsBodySchema,
} from '../interfaces/App';

type CreateAppsRequestBody = Array<AppBody>;

const createAppsRequestBodySchema = appsBodySchema.min(1);
const createAppsValidationPairs: ValidationPairs = new Map([
    [createAppsRequestBodySchema, selectBodyToValidate],
]);

const validateAppsBeforeCreate = validateRequest(createAppsValidationPairs);

const selectAppsNames = _.map<AppBody, string>(_.get('name'));

const createApps = async (req: Request, res: Response): Promise<void> => {
    await validateAppsBeforeCreate(req, res);

    const apps: CreateAppsRequestBody = req.body;

    await db.batchInsert('apps', prepareAppsToInsert(apps));

    const appsNames: Array<string> = selectAppsNames(apps);
    const savedApps: Array<App> = await db.select().from<App>('apps').whereIn('name', appsNames);

    res.status(200).send(preProcessResponse(savedApps));
};

export default createApps;
