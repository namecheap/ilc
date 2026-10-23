import { RequestHandler } from 'express';
import Joi from 'joi';

import preProcessResponse from '../../common/services/preProcessResponse';
import { validated } from '../../common/validation/validated';
import { appParamsSchema, partialAppSchema } from '../interfaces';
import { NotFoundFqrnError } from '../../common/services/entries/error/NotFoundFqrnError';
import { ValidationFqrnError } from '../../common/services/entries/error/ValidationFqrnError';
import { joiErrorToResponse } from '../../util/helpers';
import { AssetsManifestError } from '../../common/services/assets/errors/AssetsManifestError';
import type { AppsService } from '../services/AppsService';

export function updateApp(service: AppsService): RequestHandler {
    return validated({ params: appParamsSchema, body: partialAppSchema }, async ({ params, body }, req, res) => {
        let results;

        try {
            results = await service.patch(params.name, body, req.user);
        } catch (error) {
            if (error instanceof NotFoundFqrnError) {
                res.status(error.code).send(error.message);
                return;
            } else if (error instanceof ValidationFqrnError) {
                res.status(error.code).send(error.message);
                return;
            } else if (error instanceof Joi.ValidationError) {
                res.status(422).send(joiErrorToResponse(error));
                return;
            } else if (error instanceof AssetsManifestError) {
                res.status(422).send(error.message);
                return;
            }
            throw error;
        }

        res.status(200).send(preProcessResponse(results));
    });
}
