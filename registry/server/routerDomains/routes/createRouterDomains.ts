import { Request, Response } from 'express';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import RouterDomains, { routerDomainsSchema } from '../interfaces';

const validateRequest = validateRequestFactory([
    {
        schema: routerDomainsSchema,
        selector: 'body',
    },
]);

const createRouterDomains = async (req: Request, res: Response): Promise<void> => {
    let routerDomainId: number;
    await db.versioning(req.user, { type: 'router_domains' }, async (trx) => {
        [routerDomainId] = await db('router_domains').insert(req.body).transacting(trx);

        return routerDomainId;
    });

    const [savedRouterDomains] = await db.select().from<RouterDomains>('router_domains').where('id', routerDomainId!);

    res.status(200).send(preProcessResponse(savedRouterDomains));
};

export default [validateRequest, createRouterDomains];
