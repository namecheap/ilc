import {
    Request,
    Response,
} from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';

const getAllRouterDomains = async (req: Request, res: Response): Promise<void> => {
    const query = db.select().from('router_domains');
    const routerDomains = await query.range(req.query.range as string | undefined);

    res.setHeader('Content-Range', routerDomains.pagination.total);
    res.status(200).send(preProcessResponse(routerDomains));
};

export default [getAllRouterDomains];
