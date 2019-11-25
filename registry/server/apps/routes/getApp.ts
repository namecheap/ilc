import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

import db from '../../db';
import App from '../interfaces';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import {
    AppName,
    appNameSchema,
} from '../interfaces';

type GetAppRequestParams = {
    name: AppName
};

const validateRequestBeforeGetApp = validateRequestFactory([{
    schema: Joi.object({
        name: appNameSchema.required(),
    }),
    selector: _.get('params'),
}]);

const getApp = async (req: Request<GetAppRequestParams>, res: Response): Promise<void> => {
    await validateRequestBeforeGetApp(req, res);

    const {
        name: appName,
    } = req.params;

    const [app] = await db.select().from<App>('apps').where('name', appName);

    res.status(200).send(preProcessResponse(app));
};

export default getApp;
