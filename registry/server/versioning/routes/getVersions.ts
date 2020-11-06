import {
    Request,
    Response,
} from 'express';
import _ from 'lodash';

import db from '../../db';

const getVersions = async (req: Request, res: Response): Promise<void> => {
    const filters = req.query.filter ? JSON.parse(req.query.filter as string) : {};

    const query = db.select().from('versioning').orderBy('id', 'desc');
    if (filters.id) {
        query.whereIn('name', [...filters.id]);
    }
    if (filters.entity_type || filters.entity_id) {
        query.where(_.pick(filters, ['entity_type', 'entity_id']));
    }

    const dbRes = await query.range(req.query.range as string | undefined);

    res.setHeader('Content-Range', dbRes.pagination.total); //Stub for future pagination capabilities
    res.status(200).send(dbRes.data);
};

export default [getVersions];
