import { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { appParamsSchema } from '../interfaces';
import type { AppsService } from '../services/AppsService';

export function deleteApp(service: AppsService): RequestHandler {
    return validated({ params: appParamsSchema }, async ({ params }, req, res) => {
        await service.delete(params.name, req.user);

        res.status(204).send();
    });
}
