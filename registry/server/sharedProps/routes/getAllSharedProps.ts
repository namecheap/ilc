import { Request, Response } from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import SharedProps, { sharedPropsNameSchema } from '../interfaces';
import { tables } from '../../db/structure'
import { appendDigest } from '../../util/hmac'

const getSharedProps = async (req: Request, res: Response): Promise<void> => {
    const entityId = db.ref(`${tables.sharedProps}.name`);
    const versionIdSubQuery = db
        .table(tables.versioning)
        .max('id').as('versionId')
        .where('entity_id', entityId)
        .andWhere('entity_type', 'shared_props');
    const sharedProps = await db
        .select(`${tables.sharedProps}.*`, versionIdSubQuery)
        .from<SharedProps>('shared_props');
    const sharedPropsWithId = sharedProps.map(item => {
        return { ...item, versionId: appendDigest(item.versionId, 'sharedProp') };
    });

    res.setHeader('Content-Range', sharedPropsWithId.length); //Stub for future pagination capabilities
    res.status(200).send(preProcessResponse(sharedPropsWithId));
};

export default [getSharedProps];
