import { Request, Response } from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import { tables } from '../../db/structure'
import { appendDigest } from '../../util/hmac'
import { EntityTypes } from '../../versioning/interfaces';

const getSharedLibs = async (req: Request, res: Response): Promise<void> => {
    const query = db
        .selectVersionedRows(tables.sharedLibs, 'name', EntityTypes.shared_libs, [`${tables.sharedLibs}.*`])
        .from(tables.sharedLibs);
    const sharedLibs = await query.range(req.query.range as string | undefined);
    const itemsWithId = sharedLibs.data.map((item: any) => {
        return { ...item, versionId: appendDigest(item.versionId, 'sharedLib') };
    });

    res.setHeader('Content-Range', sharedLibs.pagination.total);
    res.status(200).send(preProcessResponse(itemsWithId));
};

export default [getSharedLibs];
