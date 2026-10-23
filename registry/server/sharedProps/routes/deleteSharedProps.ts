import { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { sharedPropsParamsSchema } from '../interfaces';
import type { SharedPropsService } from '../services/SharedPropsService';

export function deleteSharedProps(service: SharedPropsService): RequestHandler {
    return validated({ params: sharedPropsParamsSchema }, async ({ params }, req, res) => {
        await service.delete(params.name, req.user);

        res.status(204).send();
    });
}
