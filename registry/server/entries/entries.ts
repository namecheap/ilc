import express, { Request, Response, Router } from 'express';
import Joi from 'joi';
import { z } from 'zod';
import type { User } from '../../typings/User';
import { EntryFactory } from '../common/services/entries/EntryFactory';
import { IncorrectEntryError } from '../common/services/entries/error/IncorrectEntryError';
import { NotFoundFqrnError } from '../common/services/entries/error/NotFoundFqrnError';
import preProcessResponse from '../common/services/preProcessResponse';
import { ValidationFqrnError } from '../common/services/entries/error/ValidationFqrnError';
import { joiErrorToResponse } from '../util/helpers';
import { AssetsManifestError } from '../common/services/assets/errors/AssetsManifestError';
import { UnprocessableContent } from '../errorHandler/httpErrors';
import { partialSharedLibSchema } from '../sharedLibs/interfaces';
import type { SharedLibsService } from '../sharedLibs/services/SharedLibsService';

const SHARED_LIB_PREFIX = '@sharedLibrary/';

export function createEntriesRouter(sharedLibs: SharedLibsService): Router {
    const EntriesRouter = express.Router();

    EntriesRouter.patch('/:fqrn', async (request: Request<{ fqrn: string }>, response: Response) => {
        const fqrn = request.params.fqrn;
        const params = request.body;
        let entryService;

        try {
            entryService = getEntry(fqrn, sharedLibs);
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

    return EntriesRouter;
}

function getEntry(fqrn: string, sharedLibs: SharedLibsService) {
    if (!fqrn.startsWith(SHARED_LIB_PREFIX)) {
        return EntryFactory.getFqrnInstance(fqrn);
    }

    // The prefix is not part of the shared library name
    const name = fqrn.substring(SHARED_LIB_PREFIX.length);

    return {
        async patch(params: unknown, { user }: { user?: User }) {
            const result = await partialSharedLibSchema.safeParseAsync(params);
            if (!result.success) {
                throw new UnprocessableContent({ message: z.prettifyError(result.error) });
            }
            return sharedLibs.update(name, result.data, user);
        },
    };
}
