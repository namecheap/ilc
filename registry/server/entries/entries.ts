import express, { Request, Response, Router } from 'express';
import type { User } from '../../typings/User';
import { IncorrectEntryError } from '../common/services/entries/error/IncorrectEntryError';
import { NotFoundFqrnError } from '../common/services/entries/error/NotFoundFqrnError';
import { preProcessResponse } from '../common/services/preProcessResponse';
import { ValidationFqrnError } from '../common/services/entries/error/ValidationFqrnError';
import { AssetsManifestError } from '../common/services/assets/errors/AssetsManifestError';
import { parseInput } from '../common/validation/validated';
import { partialAppSchema } from '../apps/interfaces';
import type { AppsService } from '../apps/services/AppsService';
import { partialSharedLibSchema } from '../sharedLibs/interfaces';
import type { SharedLibsService } from '../sharedLibs/services/SharedLibsService';

const SHARED_LIB_PREFIX = '@sharedLibrary/';
const APP_PREFIX = '@portal/';

export function createEntriesRouter(apps: AppsService, sharedLibs: SharedLibsService): Router {
    const EntriesRouter = express.Router();

    EntriesRouter.patch('/:fqrn', async (request: Request<{ fqrn: string }>, response: Response) => {
        const fqrn = request.params.fqrn;
        const params = request.body;
        let entryService;

        try {
            entryService = getEntry(fqrn, apps, sharedLibs);
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

function getEntry(fqrn: string, apps: AppsService, sharedLibs: SharedLibsService) {
    if (fqrn.startsWith(SHARED_LIB_PREFIX)) {
        // The prefix is not part of the shared library name
        const name = fqrn.substring(SHARED_LIB_PREFIX.length);
        return {
            async patch(params: unknown, { user }: { user?: User }) {
                return sharedLibs.update(name, await parseInput(partialSharedLibSchema, params), user);
            },
        };
    }

    if (fqrn.startsWith(APP_PREFIX)) {
        // App names keep the prefix
        return {
            async patch(params: unknown, { user }: { user?: User }) {
                return apps.patch(fqrn, await parseInput(partialAppSchema, params), user);
            },
        };
    }

    throw new IncorrectEntryError(fqrn);
}
