import { RequestHandler } from 'express';

import preProcessResponse from '../../common/services/preProcessResponse';
import { validated } from '../../common/validation/validated';
import { partialSharedPropsSchema, sharedPropsParamsSchema } from '../interfaces';
import type { SharedPropsService } from '../services/SharedPropsService';

export function updateSharedProps(service: SharedPropsService): RequestHandler {
    return validated(
        { params: sharedPropsParamsSchema, body: partialSharedPropsSchema },
        async ({ params, body }, req, res) => {
            const updatedSharedProps = await service.update(params.name, body, req.user);

            res.status(200).send(preProcessResponse(updatedSharedProps));
        },
    );
}
