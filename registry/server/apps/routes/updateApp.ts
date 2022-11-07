import {
    Request,
    Response,
} from 'express';
import Joi from 'joi';

import validateRequestFactory from '../../common/services/validateRequest';
import preProcessResponse from '../../common/services/preProcessResponse';
import {
    appNameSchema,
    partialAppSchema,
} from '../interfaces';
import {EntryFactory} from '../../common/services/entries/EntryFactory';
import {NotFoundFqrnError} from '../../common/services/entries/error/NotFoundFqrnError';
import {ValidationFqrnError} from '../../common/services/entries/error/ValidationFqrnError';
import {joiErrorToResponse} from '../../util/helpers';
import {AssetsManifestError} from '../../common/services/assets/errors/AssetsManifestError';

type UpdateAppRequestParams = {
    name: string
};

const validateRequestBeforeUpdateApp = validateRequestFactory([
    {
        schema: Joi.object({
            name: appNameSchema.required(),
        }),
        selector: 'params',
    },
    {
        schema: partialAppSchema,
        selector: 'body'
    },
]);

const updateApp = async (req: Request<UpdateAppRequestParams>, res: Response): Promise<Response> => {
    const app = req.body;
    const appName = req.params.name;

    const sharedLibEntry = EntryFactory.getAppInstance(appName);

    let results;

    try {
        results = await sharedLibEntry.patch(app, { user: req.user });
    } catch (error) {
        if(error instanceof NotFoundFqrnError) {
            return res.status(error.code).send(error.message);
        }else if(error instanceof ValidationFqrnError) {
            return res.status(error.code).send(error.message);
        }else if(error instanceof Joi.ValidationError) {
            return res.status(422).send(joiErrorToResponse(error));
        }else if(error instanceof AssetsManifestError) {
            return res.status(error.code).send(error.message);
        }
        throw error;
    }

    return res.status(200).send(preProcessResponse(results));
};

export default [validateRequestBeforeUpdateApp, updateApp];
