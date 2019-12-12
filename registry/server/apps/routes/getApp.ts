import {
    Request,
    Response,
} from 'express';
import Joi from '@hapi/joi';
import _ from 'lodash/fp';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import {
    appNameSchema,
} from '../interfaces';

type GetAppRequestParams = {
    name: string
};

const validateRequestBeforeGetApp = validateRequestFactory([{
    schema: Joi.object({
        name: appNameSchema.required(),
    }),
    selector: _.get('params'),
}]);

const getApp = async (req: Request<GetAppRequestParams>, res: Response): Promise<void> => {
    try {
        await validateRequestBeforeGetApp(req, res);
    } catch(err) {
        res.status(422).send(err);
        return;
    }

    const appName = req.params.name;

    const [app] = await db.select().from('apps').where('name', appName);

    if (!app) {
        res.status(404).send('Not found');
    } else {
        res.status(200).send(preProcessResponse(app));
    }
};

export default getApp;
