import {NextFunction, Request, Response} from 'express';
import db from '../../db';
import { prepareAppRoutesToRespond } from '../services/prepareAppRoute';
import { transformSpecialRoutesForConsumer, SPECIAL_PREFIX} from '../services/transformSpecialRoutes';
import {domainRestrictionGuard, extractHost} from "../guards";
import { patchRoute } from "../services/dataPatch";

const getAppRoutes = async (req: Request, res: Response, next: NextFunction) => {
    let filters;

    try {
        filters = req.query.filter ? JSON.parse(req.query.filter as string) : {};
    } catch(error) {
        // log error
    }

    const query = db
        .select('routes.id as routeId', 'routes.*')
        .orderBy('orderPos', 'ASC')
        .from('routes');

    if (filters.showSpecial === true) {
        query.where('routes.route', 'like', `${SPECIAL_PREFIX}%`);
    } else {
        query.whereNot('routes.route', 'like', `${SPECIAL_PREFIX}%`);

        if (filters.routePrefix !== undefined) {
            query.where('routes.route', 'like', `${filters.routePrefix}%`)
        }
    }

    const domainId = Number(filters.domainId);
    if (domainId) {
        query.where('domainId', filters.domainId)
    }

    const appRoutes = await query.range(req.query.range as string | undefined);
    appRoutes.data = transformSpecialRoutesForConsumer(appRoutes.data)

    res.setHeader('Content-Range', appRoutes.pagination.total); //Stub for future pagination capabilities

    try {
        const domainName = extractHost(req);
        const prepared = prepareAppRoutesToRespond(appRoutes.data);
        const guard = domainRestrictionGuard(domainName);
        const processed = await Promise.all(
            prepared.map(async v => {
                const route = await patchRoute(v);

                const isAllowed = guard(route);
                if(isAllowed) return route;
            })
        );

        res.status(200).send(processed)
    } catch(error) {
        // log error
        res.status(400);
    }

    next();
};

export default [getAppRoutes];
