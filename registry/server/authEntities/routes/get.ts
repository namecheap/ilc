import { Request, Response } from 'express';
import Joi from 'joi';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import SharedProps from '../interfaces';
import { tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';

type RequestParams = {
    id: string;
};

const validateRequest = validateRequestFactory([
    {
        schema: Joi.object({
            id: Joi.number().required(),
        }),
        selector: 'params',
    },
]);

const getSharedProps = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const versionIdSubQuery = db
        .table(tables.versioning)
        .max('id').as('versionId')
        .where('entity_id', db.raw(`cast(${tables.authEntities}.id as char)`))
        .andWhere('entity_type', 'auth_entities');
    const [record] = await db
        .select(`${tables.authEntities}.*`, versionIdSubQuery)
        .from<SharedProps>('auth_entities').where('id', req.params.id);

    if (!record) {
        res.status(404).send('Not found');
    } else {
        delete record.secret;
        record.versionId = appendDigest(record.versionId, 'authEntities');
        res.status(200).send(preProcessResponse(record));
    }
};

export default [validateRequest, getSharedProps];
