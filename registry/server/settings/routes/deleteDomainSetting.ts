import type { Request, Response } from 'express';
import Joi from 'joi';

import validateRequestFactory from '../../common/services/validateRequest';
import db from '../../db';
import * as httpErrors from '../../errorHandler/httpErrors';

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

const deleteSettingForDomain = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const id = req.params.id;

    const existingSetting = await db('settings_domain_value')
        .where({ id: Number(id) })
        .first();

    if (!existingSetting) {
        throw new httpErrors.NotFoundError();
    }

    await db('settings_domain_value')
        .where({ id: Number(id) })
        .delete();
    res.status(204).send();
};

export default [validateRequest, deleteSettingForDomain];
