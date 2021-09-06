import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import setDataFromManifest from '../../common/middlewares/setDataFromManifest';
import SharedLib, {
    sharedLibNameSchema,
    partialSharedLibSchema,
} from '../interfaces';

type UpdateSharedLibRequestParams = {
    name: string
};

const validateRequestBeforeUpdateSharedLib = validateRequestFactory([
    {
        schema: Joi.object({
            name: sharedLibNameSchema.required(),
        }),
        selector: 'params',
    },
    {
        schema: partialSharedLibSchema,
        selector: 'body'
    },
]);

const updateSharedLib = async (req: Request<UpdateSharedLibRequestParams>, res: Response): Promise<void> => {
    const sharedLib = req.body;
    const sharedLibName = req.params.name;

    try {
        await setDataFromManifest(sharedLib, 'shared_libs');
    } catch (error) {
        res.status(422).send(error.message);
        return;
    }

    const countToUpdate = await db('shared_libs').where({ name: sharedLibName })
    if (!countToUpdate.length) {
        res.status(404).send('Not found');
        return;
    }

    await db.versioning(req.user, { type: 'shared_libs', id: sharedLibName }, async (trx) => {
        await db('shared_libs').where({ name: sharedLibName }).update(sharedLib).transacting(trx);
    });

    const [updatedSharedLib] = await db.select().from<SharedLib>('shared_libs').where('name', sharedLibName);

    res.status(200).send(preProcessResponse(updatedSharedLib));
};

export default [validateRequestBeforeUpdateSharedLib, updateSharedLib];
