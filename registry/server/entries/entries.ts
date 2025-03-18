import express, { Request, Response } from 'express';
import Joi from 'joi';
import { EntryFactory } from '../common/services/entries/EntryFactory';
import { IncorrectEntryError } from '../common/services/entries/error/IncorrectEntryError';
import { NotFoundFqrnError } from '../common/services/entries/error/NotFoundFqrnError';
import preProcessResponse from '../common/services/preProcessResponse';
import { ValidationFqrnError } from '../common/services/entries/error/ValidationFqrnError';
import { joiErrorToResponse } from '../util/helpers';
import { AssetsManifestError } from '../common/services/assets/errors/AssetsManifestError';

const EntriesRouter = express.Router();

EntriesRouter.patch('/:fqrn', async (request: Request<{ fqrn: string }>, response: Response) => {
    const fqrn = request.params.fqrn;
    const params = request.body;
    let entryService;

    try {
        entryService = EntryFactory.getFqrnInstance(fqrn);
    } catch (error) {
        if (error instanceof IncorrectEntryError) {
            return response.status(error.code).send(error.message);
        }
        throw error;
    }

    let results;
    try {
        results = await entryService.patch(params, { user: request.user });
    } catch (error) {
        if (error instanceof NotFoundFqrnError) {
            return response.status(error.code).send(error.message);
        } else if (error instanceof ValidationFqrnError) {
            return response.status(error.code).send(error.message);
        } else if (error instanceof Joi.ValidationError) {
            return response.status(422).send(joiErrorToResponse(error));
        }
        if (error instanceof AssetsManifestError) {
            return response.status(422).send(error.message);
        }
        throw error;
    }

    return response.status(200).send(preProcessResponse(results));
});

export default EntriesRouter;
