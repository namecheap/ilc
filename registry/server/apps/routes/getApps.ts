import {
    Request,
    Response,
} from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';

const getApps = async (req: Request, res: Response): Promise<void> => {
    const filters = req.query.filter ? JSON.parse(req.query.filter as string) : {};

    const query = db.select().from('apps');
    if (filters.id || filters.name) {
        query.whereIn('name', [...filters.id || filters.name]);
    }

    const apps = await query.range(req.query.range as string | undefined);

    res.setHeader('Content-Range', apps.pagination.total); //Stub for future pagination capabilities
    res.status(200).send(preProcessResponse(apps.data));
};

export default [getApps];
