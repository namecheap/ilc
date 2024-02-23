import { Request, Response } from 'express';
import Joi from 'joi';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import SharedProps, { sharedPropsNameSchema } from '../interfaces';
import { tables } from '../../db/structure'
import { appendDigest } from '../../util/hmac';

type RequestParams = {
    name: string;
};

const validateRequest = validateRequestFactory([
    {
        schema: Joi.object({
            name: sharedPropsNameSchema.required(),
        }),
        selector: 'params',
    },
]);

const getSharedProps = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const entityId = db.ref(`${tables.sharedProps}.name`);
    const versionIdSubQuery = db
        .table(tables.versioning)
        .max('id').as('versionId')
        .where('entity_id', entityId)
        .andWhere('entity_type', 'shared_props');
    const [sharedProps] = await db
        .select(`${tables.sharedProps}.*`, versionIdSubQuery)
        .from<SharedProps>(tables.sharedProps)
        .where('name', req.params.name);

    if (!sharedProps) {
        res.status(404).send('Not found');
    } else {
        sharedProps.versionId = appendDigest(sharedProps.versionId, 'sharedProp');
        res.status(200).send(preProcessResponse(sharedProps));
    }
};

export default [validateRequest, getSharedProps];
