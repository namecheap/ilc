import { RequestHandler } from 'express';

import type { AppsService } from '../../apps/services/AppsService';
import preProcessResponse from '../../common/services/preProcessResponse';

export function appDiscovery(service: AppsService): RequestHandler {
    return async (req, res) => {
        const apps = await service.listDiscoveryMetadata();

        res.status(200).send(preProcessResponse(apps));
    };
}
