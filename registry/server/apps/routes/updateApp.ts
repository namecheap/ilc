import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import preProcessResponse from '../../services/preProcessResponse';
import {preInsertApp} from '../services/preInsertApps';
import App, { AppBody } from '../interfaces/App';

type UpdateAppRequestBody = AppBody;

const updateApp = async (req: Request, res: Response) => {
    const app: UpdateAppRequestBody = req.body;
    const {
        name: appName,
    } = app;

    await db.where({name: appName}).update(preInsertApp(app));

    const [updatedApp]: Array<App> = await db.select().from<App>('apps').where('name', appName);

    return res.status(200).send(preProcessResponse(updatedApp));
};

export default updateApp;
