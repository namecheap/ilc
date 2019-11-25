import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import prepareAppToInsert from '../services/prepareAppToInsert';
import App, {
    appBodySchema,
} from '../interfaces';

const validateRequestBeforeCreateApp = validateRequestFactory([{
    schema: appBodySchema,
    selector: _.get('body'),
}]);

const createApp = async (req: Request, res: Response): Promise<void> => {
    await validateRequestBeforeCreateApp(req, res);

    const app = req.body;

    await db('apps').insert(prepareAppToInsert(app));

    const [savedApp] = await db.select().from<App>('apps').where('name', app.name);

    res.status(200).send(preProcessResponse(savedApp));
};

export default createApp;
