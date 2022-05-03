import {
    NextFunction,
    Request,
    Response,
} from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import { domainRestrictionGuard } from "../../appRoutes/guards";
import { extractHostname } from "../../appRoutes/guards";

const getAllRouterDomains = (
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const domainName = extractHostname(req);

        const query = db.select().from('router_domains');
        const routerDomains = await query.range(req.query.range as string | undefined);

        res.setHeader('Content-Range', routerDomains.pagination.total);
        const guard = domainRestrictionGuard(domainName);
        const filtered = preProcessResponse(routerDomains.data).map(
            (item: Record<string, unknown>) => {
                const isAllowed = guard(item);

                if(isAllowed) return item;
            }
        );

        res.status(200).send(filtered.filter(Boolean));

        next();
    }
);

export default [getAllRouterDomains];
