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
    selectParamsToValidate,
} from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import {
    prepareAppToInsert,
} from '../services/prepareAppsToInsert';
import App, {
    AppBody,
    AppName,
    appNameSchema,
    partialAppBodySchema,
} from '../interfaces/App';

export type UpdateAppRequestBody = AppBody;
export type UpdateAppRequestParams = {
    name: AppName
};

const updateAppRequestQuery = Joi.object({
    name: appNameSchema.required(),
});
const updateAppValidationPairs: ValidationPairs = new Map([
    [updateAppRequestQuery, selectParamsToValidate],
    [partialAppBodySchema, selectBodyToValidate],
]);

const validateAppBeforeUpdate = validateRequest(updateAppValidationPairs);

const selectAppDataToUpdate = (app: AppBody): Partial<App> => _.compose<any, App, Partial<App>>(
    _.pick(_.keys(app)),
    prepareAppToInsert,
)(app);

const updateApp = async (req: Request<UpdateAppRequestParams>, res: Response): Promise<void> => {
    await validateAppBeforeUpdate(req, res);

    const app: UpdateAppRequestBody = req.body;
    const {
        name: appName
    } = req.params;
    const appDataToUpdate = selectAppDataToUpdate(app);

    await db('apps').where({ name: appName }).update(appDataToUpdate);

    const updatedAppName = appDataToUpdate.name || appName;
    const [updatedApp]: Array<App> = await db.select().from<App>('apps').where('name', updatedAppName);

    res.status(200).send(preProcessResponse(updatedApp));
};

export default updateApp;
