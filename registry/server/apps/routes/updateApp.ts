import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

import db from '../../db';
import validationMiddleware, {
    ValidationPairs,
    selectBodyToValidate,
    selectQueryToValidate
} from '../../common/middlewares/validationMiddleware';
import preProcessResponse from '../../common/services/preProcessResponse';
import { prepareAppToInsert } from '../services/prepareAppsToInsert';
import App, { AppBody, AppName, appNameSchema, partialAppBodySchema } from '../interfaces/App';

type UpdateAppRequestBody = AppBody;
type UpdateAppRequestQuery = {
    name: AppName
};

const selectAppDataToUpdate = (app: AppBody): Partial<App> => _.compose<any, App, Partial<App>>(
    _.pick(_.keys(app)),
    prepareAppToInsert,
)(app);

const updateApp = async (req: Request, res: Response) => {
    const app: UpdateAppRequestBody = req.body;
    const {
        name: appName
    }: UpdateAppRequestQuery = req.query;
    const appDataToUpdate = selectAppDataToUpdate(app);

    await db('apps').where({ name: appName }).update(appDataToUpdate);

    const updatedAppName = appDataToUpdate.name || appName;
    const [updatedApp]: Array<App> = await db.select().from<App>('apps').where('name', updatedAppName);

    return res.status(200).send(preProcessResponse(updatedApp));
};

const updateAppRequestQuery = Joi.object({
    name: appNameSchema.required(),
});
const updateAppValidationPairs: ValidationPairs = new Map([
    [updateAppRequestQuery, selectQueryToValidate],
    [partialAppBodySchema, selectBodyToValidate],
]);

export const validateAppBeforeUpdate = validationMiddleware(updateAppValidationPairs);

export default updateApp;
