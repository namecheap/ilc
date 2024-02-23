import { Request, Response } from 'express';
import Joi from 'joi';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import SharedLib, { sharedLibNameSchema } from '../interfaces';
import { tables } from '../../db/structure'
import { appendDigest } from '../../util/hmac'

type GetSharedLibRequestParams = {
    name: string;
};

const validateRequestBeforeGetSharedLib = validateRequestFactory([
    {
        schema: Joi.object({
            name: sharedLibNameSchema.required(),
        }),
        selector: 'params',
    },
]);

const getSharedLib = async (req: Request<GetSharedLibRequestParams>, res: Response): Promise<void> => {
    const sharedLibName = req.params.name;
    const entityId = db.ref(`${tables.sharedLibs}.name`);
    const versionIdSubQuery = db
        .table(tables.versioning)
        .max('id').as('versionId')
        .where('entity_id', entityId)
        .andWhere('entity_type', 'shared_libs');
    const [sharedLib] = await db
        .select(`${tables.sharedLibs}.*`, versionIdSubQuery)
        .from<SharedLib>(tables.sharedLibs)
        .where('name', sharedLibName);

    if (!sharedLib) {
        res.status(404).send('Not found');
    } else {
        sharedLib.versionId = appendDigest(sharedLib.versionId, 'sharedLib');
        res.status(200).send(preProcessResponse(sharedLib));
    }
};

export default [validateRequestBeforeGetSharedLib, getSharedLib];
