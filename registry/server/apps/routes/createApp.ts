import {
    Request,
    Response,
} from 'express';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import setDataFromManifest from '../../common/middlewares/setDataFromManifest';
import {
    stringifyJSON,
} from '../../common/services/json';
import App, {
    appSchema,
} from '../interfaces';

const validateRequestBeforeCreateApp = validateRequestFactory([{
    schema: appSchema,
    selector: 'body',
}]);

const createApp = async (req: Request, res: Response): Promise<void> => {
    const app = req.body;

    try {
        await setDataFromManifest(app, 'apps');
    } catch (error: any) {
        res.status(422).send(error.message);
        return;
    }

    await db.versioning(req.user, {type: 'apps', id: app.name}, async (trx) => {
        await db('apps')
            .insert(stringifyJSON(['dependencies', 'props', 'ssrProps', 'ssr', 'configSelector', 'discoveryMetadata'], app))
            .transacting(trx);
    });

    const [savedApp] = await db.select().from<App>('apps').where('name', app.name);

    res.status(200).send(preProcessResponse(savedApp));
};

export default [validateRequestBeforeCreateApp, createApp];
