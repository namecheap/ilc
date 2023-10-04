import type { Request, Response } from 'express';
import _ from 'lodash';

import db from '../../db';

import type { VersionRow } from '../interfaces';

const getVersions = async (req: Request, res: Response): Promise<void> => {
    const filters = req.query.filter ? JSON.parse(req.query.filter as string) : {};

    const query = db.select<VersionRow[]>().from('versioning').orderBy('id', 'desc');
    if (filters.id) {
        query.whereIn('name', [...filters.id]);
    }
    if (filters.entity_type || filters.entity_id || filters.created_by) {
        query.where(_.pick(filters, ['entity_type', 'entity_id', 'created_by']));
    }

    const dbRes = await query.range(req.query.range as string | undefined);
    const result = dbRes.data.map((x) => ({ ...x, created_at: new Date(x.created_at).toISOString() }));

    res.setHeader('Content-Range', dbRes.pagination.total); //Stub for future pagination capabilities
    res.status(200).send(result);
};

export default [getVersions];
