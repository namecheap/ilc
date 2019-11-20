import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import preProcessResponse from '../../services/preProcessResponse';
import prepareAppsToInsert from '../services/prepareAppsToInsert';
import App, { AppBody } from '../interfaces/App';

type CreateAppsRequestBody = Array<AppBody>;

const selectAppsNames = _.map<AppBody, string>(_.get('name'));

const createApps = async (req: Request, res: Response) => {
    const apps: CreateAppsRequestBody = req.body;

    await db.batchInsert('apps', prepareAppsToInsert(apps));

    const appsNames: Array<string> = selectAppsNames(apps);
    const savedApps: Array<App> = await db.select().from<App>('apps').whereIn('name', appsNames);

    return res.status(200).send(preProcessResponse(savedApps));
};

export default createApps;
