import {
    Request,
    Response,
} from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';

const getAllRouterDomains = async (req: Request, res: Response): Promise<void> => {
    const routerDomains = await db.select().from('router_domains');

    res.setHeader('Content-Range', routerDomains.length); //Stub for future pagination capabilities
    res.status(200).send(preProcessResponse(routerDomains));
};

export default [getAllRouterDomains];
