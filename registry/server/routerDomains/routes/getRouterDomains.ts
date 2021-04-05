import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import RouterDomains, { routerDomainIdSchema } from '../interfaces';

type RequestParams = {
    id: string
};

const validateRequest = validateRequestFactory([{
    schema: Joi.object({
        id: routerDomainIdSchema,
    }),
    selector: 'params',
}]);

const getRouterDomains = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const [routerDomains] = await db.select().from<RouterDomains>('router_domains').where('id', req.params.id);

    if (!routerDomains) {
        res.status(404).send('Not found');
    } else {
        res.status(200).send(preProcessResponse(routerDomains));
    }
};

export default [validateRequest, getRouterDomains];
