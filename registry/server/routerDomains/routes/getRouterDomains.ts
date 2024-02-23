import { Request, Response } from 'express';
import Joi from 'joi';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import RouterDomains, { routerDomainIdSchema } from '../interfaces';
import { tables } from '../../db/structure'
import { appendDigest } from '../../util/hmac'


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
]);

const getRouterDomains = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const versionIdSubQuery = db
        .table(tables.versioning)
        .max('id').as('versionId')
        .where('entity_id', db.raw(`cast(${tables.routerDomains}.id as char)`))
        .andWhere('entity_type', 'router_domains');
    const [routerDomains] = await db
        .select(`${tables.routerDomains}.*`, versionIdSubQuery)
        .from<RouterDomains>(tables.routerDomains)
        .where('id', req.params.id);

    if (!routerDomains) {
        res.status(404).send('Not found');
    } else {
        routerDomains.versionId = appendDigest(routerDomains.versionId, 'routerDomains');
        res.status(200).send(preProcessResponse(routerDomains));
    }
};

export default [validateRequest, getRouterDomains];
