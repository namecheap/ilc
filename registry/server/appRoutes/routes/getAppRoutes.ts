import { Request, Response } from 'express';

import db from '../../db';
import { Tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import { AppRoute } from '../interfaces';
import { prepareAppRoutesToRespond } from '../services/prepareAppRoute';
import { SPECIAL_PREFIX, transformSpecialRoutesForConsumer } from '../services/transformSpecialRoutes';

const getAppRoutes = async (req: Request, res: Response) => {
    const filters = req.query.filter ? JSON.parse(req.query.filter as string) : {};

    const query = db
        .selectVersionedRowsFrom<AppRoute>(Tables.Routes, 'id', EntityTypes.routes, [
            'routes.id as routeId',
            'routes.*',
        ])
        .orderBy('orderPos', 'ASC');

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
    const itemsWithId = appRoutes.data.map((item: any) => {
        return { ...item, versionId: appendDigest(item.versionId, 'route') };
    });
    const appRoutesResponse = transformSpecialRoutesForConsumer(itemsWithId);

    res.setHeader('Content-Range', appRoutes.pagination.total); //Stub for future pagination capabilities
    res.status(200).send(prepareAppRoutesToRespond(appRoutesResponse));
};

export default [getAppRoutes];
