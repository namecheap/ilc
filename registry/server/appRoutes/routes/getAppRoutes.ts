import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import {
    prepareAppRoutesToRespond,
} from '../services/prepareAppRoute';

const getAppRoutes = async (req: Request, res: Response) => {
    const appRoutes = await db
        .select('routes.id as routeId', 'route_slots.id as routeSlotId', '*')
        .orderBy('orderPos', 'ASC')
        .from('routes')
        .join('route_slots', 'route_slots.routeId', 'routes.id')

    res.status(200).send(prepareAppRoutesToRespond(appRoutes));
};

export default [getAppRoutes];
