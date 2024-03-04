import { Request, Response } from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import { Tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';

const getAllRouterDomains = async (req: Request, res: Response): Promise<void> => {
    const query = db
        .selectVersionedRows(Tables.RouterDomains, 'id', EntityTypes.router_domains, [`${Tables.RouterDomains}.*`])
        .from(Tables.RouterDomains);
    const routerDomains = await query.range(req.query.range as string | undefined);
    const itemsWithId = routerDomains.data.map((item: any) => {
        return { ...item, versionId: appendDigest(item.versionId, 'routerDomains') };
    });
    res.setHeader('Content-Range', routerDomains.pagination.total);
    res.status(200).send(preProcessResponse(itemsWithId));
};

export default [getAllRouterDomains];
