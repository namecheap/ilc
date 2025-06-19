import { Request, Response } from 'express';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import RouterDomains, { routerDomainsSchema } from '../interfaces';
import { extractInsertedId } from '../../util/db';
import { defined } from '../../util/helpers';
import { stringifyJSON } from '../../common/services/json';

const validateRequest = validateRequestFactory([
    {
        schema: routerDomainsSchema,
        selector: 'body',
    },
]);

const createRouterDomains = async (req: Request, res: Response): Promise<void> => {
    let routerDomainId: number | undefined;
    await db.versioning(req.user, { type: 'router_domains' }, async (trx) => {
        const result = await db('router_domains')
            .insert(stringifyJSON(['props', 'ssrProps'], req.body), 'id')
            .transacting(trx);
        routerDomainId = extractInsertedId(result);
        return routerDomainId;
    });

    const [savedRouterDomains] = await db
        .select()
        .from<RouterDomains>('router_domains')
        .where('id', defined(routerDomainId));

    res.status(200).send(preProcessResponse(savedRouterDomains));
};

export default [validateRequest, createRouterDomains];
