import { Request, Response } from 'express';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import { markProtected } from '../../common/services/protectedEntities';
import SharedProps, { sharedPropsNameSchema } from '../interfaces';
import { Tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';

const getSharedProps = async (req: Request, res: Response): Promise<void> => {
    const sharedProps = await db
        .selectVersionedRowsFrom<SharedProps>(Tables.SharedProps, 'name', EntityTypes.shared_props, [
            `${Tables.SharedProps}.*`,
        ])
        .orderBy(`${Tables.SharedProps}.name`, 'asc');
    const sharedPropsWithId = sharedProps.map((item) => {
        return { ...item, versionId: appendDigest(item.versionId, 'sharedProp') };
    });

    res.setHeader('Content-Range', sharedPropsWithId.length); //Stub for future pagination capabilities
    res.status(200).send(preProcessResponse(markProtected(EntityTypes.shared_props, sharedPropsWithId)));
};

export default [getSharedProps];
