import { RequestHandler } from 'express';

import { AssetsManifestError } from '../../common/services/assets/errors/AssetsManifestError';
import { preProcessResponse } from '../../common/services/preProcessResponse';
import { validated } from '../../common/validation/validated';
import { appSchema } from '../interfaces';
import type { AppsService } from '../services/AppsService';

export function createApp(service: AppsService): RequestHandler {
    return validated({ body: appSchema }, async ({ body }, req, res) => {
        try {
            const results = await service.create(body, req.user);
            res.status(200).send(preProcessResponse(results));
        } catch (error) {
            if (error instanceof AssetsManifestError) {
                res.status(422).send(error.message);
                return;
            }
            throw error;
        }
    });
}
