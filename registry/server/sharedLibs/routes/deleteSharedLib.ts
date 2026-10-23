import { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { sharedLibParamsSchema } from '../interfaces';
import type { SharedLibsService } from '../services/SharedLibsService';

export function deleteSharedLib(service: SharedLibsService): RequestHandler {
    return validated({ params: sharedLibParamsSchema }, async ({ params }, req, res) => {
        await service.delete(params.name, req.user);

        res.status(204).send();
    });
}
