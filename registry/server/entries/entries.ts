import express from 'express';
import Joi from 'joi';
import {FqrnFactory} from './services/FqrnFactory';
import {IncorrectFqrnError} from './services/error/IncorrectFqrnError';
import {NotFoundFqrnError} from './services/error/NotFoundFqrnError';
import preProcessResponse from '../common/services/preProcessResponse';
import {ValidationFqrnError} from './services/error/ValidationFqrnError';
import {joiErrorToResponse} from '../util/helpers';
import {AssetsManifestError} from '../common/services/assets/errors/AssetsManifestError';

const EntriesRouter = express.Router();

EntriesRouter.patch('/:fqrn', async (request, response) => {
    const fqrn = request.params.fqrn;
    const params = request.body;
    let entryService;

    try {
        entryService = FqrnFactory.getFqrnInstance(fqrn);
    } catch (error) {
        if(error instanceof IncorrectFqrnError) {
            return response.status(error.code).send(error.message);
        }
        throw error;
    }

    let results;
    try {
        results = await entryService.patch(params, { user: request.user });
    } catch (error) {
        if(error instanceof NotFoundFqrnError) {
            return response.status(error.code).send(error.message);
        }else if(error instanceof ValidationFqrnError) {
            return response.status(error.code).send(error.message);
        }else if(error instanceof Joi.ValidationError) {
            return response.status(422).send(joiErrorToResponse(error));
        } if(error instanceof AssetsManifestError) {
            return response.status(error.code).send(error.message);
        }
        throw error;
    }

    return response.status(200).send(preProcessResponse(results));
});

export default EntriesRouter;
