import { Request, Response } from 'express';

import db from '../../db';
import Template from '../interfaces';
import { Tables } from '../../db/structure'
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';

const getTemplates = async (req: Request, res: Response): Promise<void> => {
    const templates = await db
        .selectVersionedRowsFrom<Template>(Tables.Templates, 'name', EntityTypes.templates, [`${Tables.Templates}.*`]);
    const itemsWithId = templates.map(item => {
        return { ...item, versionId: appendDigest(item.versionId, 'template') };
    });

    res.setHeader('Content-Range', templates.length); //Stub for future pagination capabilities
    res.status(200).send(itemsWithId);
};

export default [getTemplates];
