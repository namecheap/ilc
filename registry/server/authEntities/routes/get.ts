import { Request, Response } from 'express';
import Joi from 'joi';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import SharedProps from '../interfaces';

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
    const [record] = await db.select().from<SharedProps>('auth_entities').where('id', req.params.id);

    if (!record) {
        res.status(404).send('Not found');
    } else {
        delete record.secret;
        res.status(200).send(preProcessResponse(record));
    }
};

export default [validateRequest, getSharedProps];
