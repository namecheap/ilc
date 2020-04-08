import {
    Request,
    Response,
} from 'express';

import db from '../../db';
import {
    prepareAppRoutesToRespond,
} from '../services/prepareAppRoute';

const getAppRoutes = async (req: Request, res: Response) => {
    let filters = req.query.filter ? JSON.parse(req.query.filter) : {};

    const query = db
        .select('routes.id as routeId', '*')
        .orderBy('orderPos', 'ASC')
        .from('routes');

    if (filters.showSpecial === true) {
        query.whereNotNull('routes.specialRole');
    } else {
        query.whereNull('routes.specialRole');
    }

    const appRoutes = await query.range(req.query.range);

    res.setHeader('Content-Range', appRoutes.pagination.total); //Stub for future pagination capabilities
    res.status(200).send(prepareAppRoutesToRespond(appRoutes.data));
};

export default [getAppRoutes];
