import { Request, Response } from 'express';
import Joi from 'joi';
import _ from 'lodash/fp';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import App, { appNameSchema } from '../interfaces';
import { tables } from '../../db/structure'
import { appendDigest } from '../../util/hmac';

type GetAppRequestParams = {
    name: string;
};

const validateRequestBeforeGetApp = validateRequestFactory([
    {
        schema: Joi.object({
            name: appNameSchema.required(),
        }),
        selector: 'params',
    },
]);

const getApp = async (req: Request<GetAppRequestParams>, res: Response): Promise<void> => {
    const appName = req.params.name;
    const entityId = db.ref(`${tables.apps}.name`);
    const versionIdSubQuery = db
        .table(`${tables.versioning}`)
        .max('id').as('versionId')
        .where('entity_id', entityId)
        .andWhere('entity_type', 'apps');
    const [app] = await db
        .select(`${tables.apps}.*`, versionIdSubQuery)
        .from<App>('apps')
        .where('name', appName);

    if (!app) {
        res.status(404).send('Not found');
    } else {
        app.versionId = appendDigest(app.versionId, 'app');
        res.status(200).send(preProcessResponse(app));
    }
};

export default [validateRequestBeforeGetApp, getApp];
