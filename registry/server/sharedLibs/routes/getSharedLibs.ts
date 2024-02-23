import { Request, Response } from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import { tables } from '../../db/structure'
import { appendDigest } from '../../util/hmac'

const getSharedLibs = async (req: Request, res: Response): Promise<void> => {
    const entityId = db.ref(`${tables.sharedLibs}.name`);
    const versionIdSubQuery = db
        .table(tables.versioning)
        .max('id').as('versionId')
        .where('entity_id', entityId)
        .andWhere('entity_type', 'shared_libs');
    const query = db
        .select(`${tables.sharedLibs}.*`, versionIdSubQuery)
        .from(tables.sharedLibs);
    const sharedLibs = await query.range(req.query.range as string | undefined);
    const itemsWithId = sharedLibs.data.map((item: any) => {
        return { ...item, versionId: appendDigest(item.versionId, 'sharedLib') };
    });

    res.setHeader('Content-Range', sharedLibs.pagination.total);
    res.status(200).send(preProcessResponse(itemsWithId));
};

export default [getSharedLibs];
