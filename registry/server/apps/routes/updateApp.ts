import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import preProcessResponse from '../../services/preProcessResponse';
import {prepareAppToInsert} from '../services/prepareAppsToInsert';
import App, { AppBody } from '../interfaces/App';

type UpdateAppRequestBody = AppBody;
type UpdateAppRequestQuery = {
    name: string
};

interface AppToUpdate {
    name?: string,
    spaBundle?: string,
    cssBundle?: string,
    assetsDiscoveryUrl?: string,
    dependencies?: string,
    ssr?: string,
    initProps?: string,
    props?: string,
}

const selectAppDataToUpdate = (app: AppBody): AppToUpdate => _.compose<any, App, AppToUpdate>(
    _.pick(_.keys(app)),
    prepareAppToInsert,
)(app);

const updateApp = async (req: Request, res: Response) => {
    const app: UpdateAppRequestBody = req.body;
    const {
        name: appName
    }: UpdateAppRequestQuery = req.query;
    const appDataToUpdate = selectAppDataToUpdate(app);
    
    await db('apps').where({name: appName}).update(appDataToUpdate);
    
    const updatedAppName = appDataToUpdate.name || appName;
    const [updatedApp]: Array<App> = await db.select().from<App>('apps').where('name', updatedAppName);

    return res.status(200).send(preProcessResponse(updatedApp));
};

export default updateApp;
