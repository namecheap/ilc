import { Request, Response } from 'express';
import Joi from 'joi';

import validateRequestFactory from '../../common/services/validateRequest';
import { prepareAppRouteToRespond } from '../services/prepareAppRoute';
import { appRouteIdSchema } from '../interfaces';
import { transformSpecialRoutesForConsumer } from '../services/transformSpecialRoutes';
import { getRoutesById } from './routesRepository';
import { appendDigest } from '../../util/hmac';

type GetAppRouteRequestParams = {
    id: string;
};

const validateRequestBeforeGetAppRoute = validateRequestFactory([
    {
        schema: Joi.object({
            id: appRouteIdSchema,
        }),
        selector: 'params',
    },
]);

export const retrieveAppRouteFromDB = async (appRouteId: number) => {
    const appRoutes = await getRoutesById(appRouteId);

    if (!appRoutes.length) {
        return;
    }

    let data = prepareAppRouteToRespond(appRoutes);
    data = transformSpecialRoutesForConsumer(data);
    if (data.templateName) {
        data.templateName = data.templateName.toString();
    }

    return data;
};

const getAppRoute = async (req: Request<GetAppRouteRequestParams>, res: Response) => {
    const data = await retrieveAppRouteFromDB(+req.params.id);

    if (data) {
        res.status(200).send(data);
    } else {
        res.status(404).send('Not found');
    }
};

export default [validateRequestBeforeGetAppRoute, getAppRoute];
