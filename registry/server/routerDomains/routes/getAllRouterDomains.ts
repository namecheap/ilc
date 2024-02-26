import { Request, Response } from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import { tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';

const getAllRouterDomains = async (req: Request, res: Response): Promise<void> => {
    const query = db
        .selectVersionedRows(tables.routerDomains, 'id', EntityTypes.router_domains, [`${tables.routerDomains}.*`])
        .from(tables.routerDomains);
    const routerDomains = await query.range(req.query.range as string | undefined);
    const itemsWithId = routerDomains.data.map((item: any) => {
        return { ...item, versionId: appendDigest(item.versionId, 'routerDomains') };
    });
    res.setHeader('Content-Range', routerDomains.pagination.total);
    res.status(200).send(preProcessResponse(itemsWithId));
};

export default [getAllRouterDomains];
