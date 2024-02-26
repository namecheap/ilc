import { Request, Response } from 'express';

import db from '../../db';
import Template from '../interfaces';
import { tables } from '../../db/structure'
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';

const getTemplates = async (req: Request, res: Response): Promise<void> => {
    const templates = await db
        .selectVersionedRowsFrom<Template>(tables.templates, 'name', EntityTypes.templates, [`${tables.templates}.*`]);
    const itemsWithId = templates.map(item => {
        return { ...item, versionId: appendDigest(item.versionId, 'template') };
    });

    res.setHeader('Content-Range', templates.length); //Stub for future pagination capabilities
    res.status(200).send(itemsWithId);
};

export default [getTemplates];
