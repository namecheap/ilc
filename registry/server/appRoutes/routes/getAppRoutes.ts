import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import AppRoute from '../interfaces';
import {
    prepareAppRoutesToRespond,
} from '../services/prepareAppRoute';

const getAppRoutes = async (req: Request, res: Response): Promise<void> => {
    const appRoutes = await db
        .select('routes.id as routeId', '*')
        .orderBy('orderPos', 'ASC')
        .from<AppRoute>('routes')
        .join('route_slots', 'route_slots.routeId', 'routes.id')

    res.status(200).send(prepareAppRoutesToRespond(appRoutes));
};

export default getAppRoutes;
