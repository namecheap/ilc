import { RequestHandler } from 'express';

import preProcessResponse from '../../common/services/preProcessResponse';
import { markProtected } from '../../common/services/protectedEntities';
import { validated } from '../../common/validation/validated';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import { appParamsSchema } from '../interfaces';
import type { AppsService } from '../services/AppsService';

export function getApp(service: AppsService): RequestHandler {
    return validated({ params: appParamsSchema }, async ({ params }, req, res) => {
        const app = await service.get(params.name);

        if (!app) {
            res.status(404).send('Not found');
        } else {
            const appWithId = { ...app, versionId: appendDigest(app.versionId, 'app') };
            res.status(200).send(preProcessResponse(markProtected(EntityTypes.apps, appWithId)));
        }
    });
}
