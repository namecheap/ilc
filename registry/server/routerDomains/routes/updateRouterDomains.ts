import { Request, Response } from 'express';
import Joi from 'joi';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import { stringifyJSON } from '../../common/services/json';
import RouterDomains, { routerDomainIdSchema, partialRouterDomainsSchema } from '../interfaces';
import { isUniqueConstraintError } from '../../util/db';
import { getJoiErr } from '../../util/helpers';

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

const updateRouterDomains = async (
    req: Request<RequestParams, unknown, Partial<RouterDomains>>,
    res: Response,
): Promise<void> => {
    const routerDomainId = req.params.id;

    const countToUpdate = await db('router_domains').where('id', routerDomainId);
    if (!countToUpdate.length) {
        res.status(404).send('Not found');
        return;
    }

    try {
        await db.versioning(req.user, { type: 'router_domains', id: routerDomainId }, async (trx) => {
            await db('router_domains')
                .where('id', routerDomainId)
                .update(stringifyJSON(['props', 'ssrProps'], req.body))
                .transacting(trx);
        });
    } catch (e: unknown) {
        if (isUniqueConstraintError(e, 'router_domains_alias_unique', 'router_domains.alias')) {
            throw getJoiErr('alias', `Router domain with alias "${req.body.alias}" already exists.`);
        }
        throw e;
    }

    const [updatedRouterDomains] = await db('router_domains').select().where('id', routerDomainId);

    res.status(200).send(preProcessResponse(updatedRouterDomains));
};

export default [validateRequest, updateRouterDomains];
