import { RequestHandler } from 'express';

import preProcessResponse from '../../common/services/preProcessResponse';
import { markProtected } from '../../common/services/protectedEntities';
import { validated } from '../../common/validation/validated';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import { sharedLibParamsSchema } from '../interfaces';
import type { SharedLibsService } from '../services/SharedLibsService';

export function getSharedLib(service: SharedLibsService): RequestHandler {
    return validated({ params: sharedLibParamsSchema }, async ({ params }, req, res) => {
        const sharedLib = await service.get(params.name);

        if (!sharedLib) {
            res.status(404).send('Not found');
        } else {
            const sharedLibWithId = { ...sharedLib, versionId: appendDigest(sharedLib.versionId, 'sharedLib') };
            res.status(200).send(preProcessResponse(markProtected(EntityTypes.shared_libs, sharedLibWithId)));
        }
    });
}
