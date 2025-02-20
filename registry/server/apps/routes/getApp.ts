import { Request, Response } from 'express';
import Joi from 'joi';
import _ from 'lodash/fp';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import { appNameSchema } from '../interfaces';
import { Tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';

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
    const [app] = await db
        .selectVersionedRowsFrom(Tables.Apps, 'name', EntityTypes.apps, [`${Tables.Apps}.*`])
        .where('name', appName);

    if (!app) {
        res.status(404).send('Not found');
    } else {
        app.versionId = appendDigest(app.versionId, 'app');
        res.status(200).send(preProcessResponse(app));
    }
};

export default [validateRequestBeforeGetApp, getApp];
