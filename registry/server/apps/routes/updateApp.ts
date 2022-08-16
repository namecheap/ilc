import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import setDataFromManifest from '../../common/middlewares/setDataFromManifest';
import {
    stringifyJSON,
} from '../../common/services/json';
import App, {
    appNameSchema,
    partialAppSchema,
} from '../interfaces';

type UpdateAppRequestParams = {
    name: string
};

const validateRequestBeforeUpdateApp = validateRequestFactory([
    {
        schema: Joi.object({
            name: appNameSchema.required(),
        }),
        selector: 'params',
    },
    {
        schema: partialAppSchema,
        selector: 'body'
    },
]);

const updateApp = async (req: Request<UpdateAppRequestParams>, res: Response): Promise<void> => {
    const app = req.body;
    const appName = req.params.name;

    try {
        await setDataFromManifest(app, 'apps');
    } catch (error) {
        res.status(422).send((error as Error).message);
        return;
    }

    const countToUpdate = await db('apps').where({ name: appName })
    if (!countToUpdate.length) {
        res.status(404).send('Not found');
        return;
    }

    await db.versioning(req.user, {type: 'apps', id: appName}, async (trx) => {
        await db('apps')
            .where({ name: appName })
            .update(stringifyJSON([
                'dependencies',
                'props',
                'ssrProps',
                'ssr',
                'configSelector',
                'discoveryMetadata'
            ], app))
            .transacting(trx);
    });

    const [updatedApp] = await db.select().from<App>('apps').where('name', appName);

    res.status(200).send(preProcessResponse(updatedApp));
};

export default [validateRequestBeforeUpdateApp, updateApp];
