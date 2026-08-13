import { Request, Response } from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import { markProtected } from '../../common/services/protectedEntities';
import { Tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';

const getSharedProps = async (req: Request, res: Response): Promise<void> => {
    let sharedProps = await db
        .selectVersionedRows(Tables.AuthEntities, 'id', EntityTypes.auth_entities, [`${Tables.AuthEntities}.*`])
        .from(Tables.AuthEntities)
        .orderBy(`${Tables.AuthEntities}.id`, 'asc');
    sharedProps = sharedProps.map((v) => {
        v.versionId = appendDigest(v.versionId, 'authEntities');
        delete v.secret;
        return markProtected(EntityTypes.auth_entities, v);
    });

    res.setHeader('Content-Range', sharedProps.length); //Stub for future pagination capabilities
    res.status(200).send(preProcessResponse(sharedProps));
};

export default [getSharedProps];
