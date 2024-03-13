import { Request, Response } from 'express';
import Joi from 'joi';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import RouterDomains, { routerDomainIdSchema } from '../interfaces';
import { Tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';

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
    const [routerDomains] = await db
        .selectVersionedRowsFrom<RouterDomains>(Tables.RouterDomains, 'id', EntityTypes.router_domains, [
            `${Tables.RouterDomains}.*`,
        ])
        .where('id', req.params.id);

    if (!routerDomains) {
        res.status(404).send('Not found');
    } else {
        routerDomains.versionId = appendDigest(routerDomains.versionId, 'routerDomains');
        res.status(200).send(preProcessResponse(routerDomains));
    }
};

export default [validateRequest, getRouterDomains];
