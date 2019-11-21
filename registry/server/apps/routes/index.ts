import express from 'express';

import getApps from './getApps';
import updateApp, {
    UpdateAppRequestParams,
    UpdateAppRequestBody,
} from './updateApp';
import createApps, {
    CreateAppsRequestBody,
} from './createApps';
import deleteApps, {
    DeleteAppsRequestBody,
} from './deleteApps';
import {
    AppBody,
} from '../interfaces/App';

const appsRouter = express.Router();

appsRouter.get<any, Array<AppBody>, void>('/', getApps);
appsRouter.put<UpdateAppRequestParams, AppBody, UpdateAppRequestBody>('/:name', updateApp);
appsRouter.post<any, Array<AppBody>, CreateAppsRequestBody>('/', createApps);
appsRouter.delete<any, void, DeleteAppsRequestBody>('/', deleteApps);

export default appsRouter;
