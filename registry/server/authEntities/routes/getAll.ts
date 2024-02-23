import { Request, Response } from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import { tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';

const getSharedProps = async (req: Request, res: Response): Promise<void> => {
    const versionIdSubQuery = db
        .table(tables.versioning)
        .max('id').as('versionId')
        .where('entity_id', db.raw(`cast(${tables.authEntities}.id as char)`))
        .andWhere('entity_type', 'auth_entities');
    let sharedProps = await db
        .select(`${tables.authEntities}.*`, versionIdSubQuery)
        .from(tables.authEntities);
    sharedProps = sharedProps.map((v) => {
        v.versionId = appendDigest(v.versionId, 'authEntities')
        delete v.secret;
        return v;
    });

    res.setHeader('Content-Range', sharedProps.length); //Stub for future pagination capabilities
    res.status(200).send(preProcessResponse(sharedProps));
};

export default [getSharedProps];
