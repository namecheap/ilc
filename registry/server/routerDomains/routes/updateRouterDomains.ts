import { Request, Response } from 'express';
import Joi from 'joi';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import { stringifyJSON } from '../../common/services/json';
import RouterDomains, { routerDomainIdSchema, partialRouterDomainsSchema } from '../interfaces';

type RequestParams = {
    id: string;
};

const validateRequest = validateRequestFactory([
    {
        schema: Joi.object({
            id: routerDomainIdSchema,
        }),
        selector: 'params',
    },
    {
        schema: partialRouterDomainsSchema,
        selector: 'body',
    },
]);

const updateRouterDomains = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const routerDomainId = req.params.id;

    const countToUpdate = await db('router_domains').where({
        id: routerDomainId,
    });
    if (!countToUpdate.length) {
        res.status(404).send('Not found');
        return;
    }

    await db.versioning(req.user, { type: 'router_domains', id: routerDomainId }, async (trx) => {
        await db('router_domains').where({ id: routerDomainId }).update(req.body).transacting(trx);
    });

    const [updatedRouterDomains] = await db.select().from<RouterDomains>('router_domains').where('id', routerDomainId);

    res.status(200).send(preProcessResponse(updatedRouterDomains));
};

export default [validateRequest, updateRouterDomains];
