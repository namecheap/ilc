import { Request, Response } from 'express';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import AuthEntity, { createSchema } from '../interfaces';

import * as bcrypt from 'bcrypt';
import { extractInsertedId } from '../../util/db';
import { defined } from '../../util/helpers';

const validateRequest = validateRequestFactory([
    {
        schema: createSchema,
        selector: 'body',
    },
]);

const createSharedProps = async (req: Request, res: Response): Promise<void> => {
    const input: AuthEntity = req.body;

    if (input.secret) {
        input.secret = await bcrypt.hash(input.secret, await bcrypt.genSalt());
    }

    let recordId: number | undefined;
    await db.versioning(req.user, { type: 'auth_entities' }, async (trx) => {
        const result = await db('auth_entities').insert(req.body, 'id').transacting(trx);
        recordId = extractInsertedId(result);
        return recordId;
    });

    const [savedRecord] = await db.select().from<AuthEntity>('auth_entities').where('id', defined(recordId));

    delete savedRecord.secret;
    res.status(200).send(preProcessResponse(savedRecord));
};

export default [validateRequest, createSharedProps];
