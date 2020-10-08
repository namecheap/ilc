import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import setDataFromManifest from '../middlewares/setDataFromManifest';
import {
    stringifyJSON,
} from '../../common/services/json';
import App, {
    appSchema,
} from '../interfaces';

const validateRequestBeforeCreateApp = validateRequestFactory([{
    schema: appSchema,
    selector: _.get('body'),
}]);

const createApp = async (req: Request, res: Response): Promise<void> => {
    const app = req.body;

    await db('apps').insert(stringifyJSON(['dependencies', 'props', 'ssr', 'configSelector'], app));

    const [savedApp] = await db.select().from<App>('apps').where('name', app.name);

    res.status(200).send(preProcessResponse(savedApp));
};

export default [validateRequestBeforeCreateApp, setDataFromManifest, createApp];
