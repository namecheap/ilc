import { RequestHandler } from 'express';

import { preProcessResponse } from '../../common/services/preProcessResponse';
import { validated } from '../../common/validation/validated';
import { sharedPropsSchema } from '../interfaces';
import type { SharedPropsService } from '../services/SharedPropsService';

export function createSharedProps(service: SharedPropsService): RequestHandler {
    return validated({ body: sharedPropsSchema }, async ({ body }, req, res) => {
        const savedSharedProps = await service.create(body, req.user);

        res.status(200).send(preProcessResponse(savedSharedProps));
    });
}
