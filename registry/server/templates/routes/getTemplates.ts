import { Request, Response } from 'express';

import db from '../../db';
import Template from '../interfaces';
import { tables } from '../../db/structure'
import { appendDigest } from '../../util/hmac';

const getTemplates = async (req: Request, res: Response): Promise<void> => {
    const entityId = db.ref(`${tables.templates}.name`);
    const versionIdSubQuery = db
        .table(tables.versioning)
        .max('id').as('versionId')
        .where('entity_id', entityId)
        .andWhere('entity_type', 'templates');
    const templates = await db
        .select(`${tables.templates}.*`, versionIdSubQuery)
        .from<Template>(tables.templates);
    const itemsWithId = templates.map(item => {
        return { ...item, versionId: appendDigest(item.versionId, 'template') };
    });

    res.setHeader('Content-Range', templates.length); //Stub for future pagination capabilities
    res.status(200).send(itemsWithId);
};

export default [getTemplates];
