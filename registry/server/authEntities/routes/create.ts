import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import AuthEntity, { createSchema } from '../interfaces';

import * as bcrypt from 'bcrypt';

const validateRequest = validateRequestFactory([{
    schema: createSchema,
    selector: _.get('body'),
}]);

const createSharedProps = async (req: Request, res: Response): Promise<void> => {
    const input: AuthEntity = req.body;

    if (input.secret) {
        input.secret = await bcrypt.hash(input.secret, await bcrypt.genSalt());
    }

    let recordId: number;
    await db.versioning(req.user, {type: 'auth_entities'}, async (trx) => {
        [recordId] = await db('auth_entities').insert(req.body).transacting(trx);
        return recordId;
    });

    const [savedRecord] = await db.select().from<AuthEntity>('auth_entities').where('id', recordId!);

    delete savedRecord.secret;
    res.status(200).send(preProcessResponse(savedRecord));
};

export default [validateRequest, createSharedProps];
