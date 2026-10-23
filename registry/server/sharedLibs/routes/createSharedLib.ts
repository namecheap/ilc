import { RequestHandler } from 'express';

import preProcessResponse from '../../common/services/preProcessResponse';
import { validated } from '../../common/validation/validated';
import { sharedLibSchema } from '../interfaces';
import { AssetsManifestError } from '../../common/services/assets/errors/AssetsManifestError';
import type { SharedLibsService } from '../services/SharedLibsService';

export function createSharedLib(service: SharedLibsService): RequestHandler {
    return validated({ body: sharedLibSchema }, async ({ body }, req, res) => {
        let results;

        try {
            results = await service.create(body, req.user);
        } catch (error) {
            if (error instanceof AssetsManifestError) {
                res.status(422).send(error.message);
                return;
            }
            throw error;
        }

        res.status(200).send(preProcessResponse(results));
    });
}
