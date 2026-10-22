import { Request, Response } from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import { markProtected } from '../../common/services/protectedEntities';
import { Tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';

const getSharedProps = async (req: Request, res: Response): Promise<void> => {
    const sharedProps = await db
        .selectVersionedRows(Tables.AuthEntities, 'id', EntityTypes.auth_entities, [`${Tables.AuthEntities}.*`])
        .from(Tables.AuthEntities)
        .orderBy(`${Tables.AuthEntities}.id`, 'asc');
    const authEntities = sharedProps.map(({ secret, ...v }) => {
        return markProtected(EntityTypes.auth_entities, { ...v, versionId: appendDigest(v.versionId, 'authEntities') });
    });

    res.setHeader('Content-Range', authEntities.length); //Stub for future pagination capabilities
    res.status(200).send(preProcessResponse(authEntities));
};

export default [getSharedProps];
