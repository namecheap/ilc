import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';

import db from '../../db';
import App from '../interfaces';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequest, {
    selectParamsToValidate,
} from '../../common/services/validateRequest';
import {
    AppName,
    appNameSchema,
} from '../interfaces';

type GetAppRequestParams = {
    name: AppName
};

const validateRequestBeforeGetApp = validateRequest(new Map([
    [Joi.object({
        name: appNameSchema.required(),
    }), selectParamsToValidate],
]));

const getApp = async (req: Request<GetAppRequestParams>, res: Response): Promise<void> => {
    await validateRequestBeforeGetApp(req, res);

    const {
        name: appName,
    } = req.params;

    const [app] = await db.select().from<App>('apps').where('name', appName);

    res.status(200).send(preProcessResponse(app));
};

export default getApp;
