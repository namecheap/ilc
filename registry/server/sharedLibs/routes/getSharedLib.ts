import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';

import db from '../../db';
import preProcessResponse from '../../common/services/preProcessResponse';
import validateRequestFactory from '../../common/services/validateRequest';
import SharedLib, {
    sharedLibNameSchema,
} from '../interfaces';

type GetSharedLibRequestParams = {
    name: string
};

const validateRequestBeforeGetSharedLib = validateRequestFactory([{
    schema: Joi.object({
        name: sharedLibNameSchema.required(),
    }),
    selector: 'params',
}]);

const getSharedLib = async (req: Request<GetSharedLibRequestParams>, res: Response): Promise<void> => {
    const sharedLibName = req.params.name;

    const [sharedLib] = await db.select().from<SharedLib>('shared_libs').where('name', sharedLibName);

    if (!sharedLib) {
        res.status(404).send('Not found');
    } else {
        res.status(200).send(preProcessResponse(sharedLib));
    }
};

export default [validateRequestBeforeGetSharedLib, getSharedLib];
