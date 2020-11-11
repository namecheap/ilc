import {
    Request,
    Response,
} from 'express';
import _ from 'lodash/fp';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import { stringifyJSON } from '../../common/services/json';
import SharedProps, { sharedPropsSchema } from '../interfaces';

const validateRequest = validateRequestFactory([{
    schema: sharedPropsSchema,
    selector: _.get('body'),
}]);

const createSharedProps = async (req: Request, res: Response): Promise<void> => {
    const sharedProps = req.body;

    await db.versioning(req.user, {type: 'shared_props', id: sharedProps.name}, async (trx) => {
        await db('shared_props').insert(stringifyJSON(['props'], sharedProps)).transacting(trx);
    });

    const [savedSharedProps] = await db.select().from<SharedProps>('shared_props').where('name', sharedProps.name);

    res.status(200).send(preProcessResponse(savedSharedProps));
};

export default [validateRequest, createSharedProps];
