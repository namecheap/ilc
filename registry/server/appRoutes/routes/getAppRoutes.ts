import { Request, Response } from 'express';
import App from '../../apps/interfaces';

import db from '../../db';
import { AppRoute } from '../interfaces';
import { prepareAppRoutesToRespond } from '../services/prepareAppRoute';
import { transformSpecialRoutesForConsumer, SPECIAL_PREFIX } from '../services/transformSpecialRoutes';

const getAppRoutes = async (req: Request, res: Response) => {
    const filters = req.query.filter ? JSON.parse(req.query.filter as string) : {};

    const query = db.select<AppRoute[]>('routes.id as routeId', 'routes.*').orderBy('orderPos', 'ASC').from('routes');

    if (filters.showSpecial === true) {
        query.where('routes.route', 'like', `${SPECIAL_PREFIX}%`);
    } else {
        query.whereNot('routes.route', 'like', `${SPECIAL_PREFIX}%`);

        if (filters.routePrefix !== undefined) {
            query.where('routes.route', 'like', `${filters.routePrefix}%`);
        }
    }

    if (filters.domainId !== undefined) {
        filters.domainId = filters.domainId === 'null' ? null : filters.domainId;
        query.where('domainId', filters.domainId);
    }

    const appRoutes = await query.range(req.query.range as string | undefined);

    const appRoutesResponse = transformSpecialRoutesForConsumer(appRoutes.data);

    res.setHeader('Content-Range', appRoutes.pagination.total); //Stub for future pagination capabilities
    res.status(200).send(prepareAppRoutesToRespond(appRoutesResponse));
};

export default [getAppRoutes];
