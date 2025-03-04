import { Request, Response } from 'express';
import Joi from 'joi';

import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import { sharedLibNameSchema, partialSharedLibSchema } from '../interfaces';
import { EntryFactory } from '../../common/services/entries/EntryFactory';
import { NotFoundFqrnError } from '../../common/services/entries/error/NotFoundFqrnError';
import { ValidationFqrnError } from '../../common/services/entries/error/ValidationFqrnError';
import { joiErrorToResponse } from '../../util/helpers';
import { AssetsManifestError } from '../../common/services/assets/errors/AssetsManifestError';

type UpdateSharedLibRequestParams = {
    name: string;
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
        selector: 'body',
    },
]);

const updateSharedLib = async (req: Request<UpdateSharedLibRequestParams>, res: Response): Promise<Response> => {
    const sharedLib = req.body;
    const sharedLibName = req.params.name;

    const sharedLibEntry = EntryFactory.getSharedLibInstance(sharedLibName);

    let results;

    try {
        results = await sharedLibEntry.patch(sharedLib, { user: req.user });
    } catch (error) {
        if (error instanceof NotFoundFqrnError) {
            return res.status(error.code).send(error.message);
        } else if (error instanceof ValidationFqrnError) {
            return res.status(error.code).send(error.message);
        } else if (error instanceof Joi.ValidationError) {
            return res.status(422).send(joiErrorToResponse(error));
        } else if (error instanceof AssetsManifestError) {
            return res.status(error.code).send(error.message);
        }
        throw error;
    }

    return res.status(200).send(preProcessResponse(results));
};

export default [validateRequestBeforeUpdateSharedLib, updateSharedLib];
