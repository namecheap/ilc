import { Request, Response } from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import App, { appNameSchema } from '../interfaces';
import { tables } from '../../db/structure'
import { appendDigest } from '../../util/hmac';

const getApps = async (req: Request, res: Response): Promise<void> => {
    const filters = req.query.filter ? JSON.parse(req.query.filter as string) : {};
    const entityId = db.ref(`${tables.apps}.name`);
    const versionIdSubQuery = db
        .table(`${tables.versioning}`)
        .max('id').as('versionId')
        .where('entity_id', entityId)
        .andWhere('entity_type', 'apps');
    const query = db
        .select(`${tables.apps}.*`, versionIdSubQuery)
        .from<App>('apps');

    if (filters.id || filters.name) {
        query.whereIn('name', [...(filters.id || filters.name)]);
    }
    if (typeof filters.kind === 'string') {
        query.where('kind', filters.kind);
    } else if (Array.isArray(filters.kind)) {
        query.whereIn('kind', filters.kind);
    }
    if (filters.q) {
        query.where('name', 'like', `%${filters.q}%`);
    }

    const apps = await query.range(req.query.range as string | undefined);
    const itemsWithId = apps.data.map((item: any) => {
        return { ...item, versionId: appendDigest(item.versionId, 'app') };
    });

    res.setHeader('Content-Range', apps.pagination.total); //Stub for future pagination capabilities
    res.status(200).send(preProcessResponse(itemsWithId));
};

export default [getApps];
