import { Request, Response } from 'express';

import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import { SharedLib, sharedLibSchema } from '../interfaces';
import { EntryFactory } from '../../common/services/entries/EntryFactory';
import Joi from 'joi';
import { joiErrorToResponse } from '../../util/helpers';
import { AssetsManifestError } from '../../common/services/assets/errors/AssetsManifestError';

const validateRequestBeforeCreateSharedLib = validateRequestFactory([
    {
        schema: sharedLibSchema,
        selector: 'body',
    },
]);

const createSharedLib = async (req: Request<{}, any, SharedLib>, res: Response): Promise<Response> => {
    const sharedLib = req.body;
    const sharedLibEntry = EntryFactory.getSharedLibInstance();

    let results;

    try {
        results = await sharedLibEntry.create(sharedLib, { user: req.user });
    } catch (error) {
        if (error instanceof Joi.ValidationError) {
            return res.status(422).send(joiErrorToResponse(error));
        } else if (error instanceof AssetsManifestError) {
            return res.status(error.code).send(error.message);
        }
        throw error;
    }

    return res.status(200).send(preProcessResponse(results));
};

export default [validateRequestBeforeCreateSharedLib, createSharedLib];
