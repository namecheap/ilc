import { RequestHandler } from 'express';

import preProcessResponse from '../../common/services/preProcessResponse';
import { markProtected } from '../../common/services/protectedEntities';
import { validated } from '../../common/validation/validated';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import { sharedPropsParamsSchema } from '../interfaces';
import type { SharedPropsService } from '../services/SharedPropsService';

export function getSharedProps(service: SharedPropsService): RequestHandler {
    return validated({ params: sharedPropsParamsSchema }, async ({ params }, req, res) => {
        const sharedProps = await service.get(params.name);

        if (!sharedProps) {
            res.status(404).send('Not found');
        } else {
            const sharedPropsWithId = { ...sharedProps, versionId: appendDigest(sharedProps.versionId, 'sharedProp') };
            res.status(200).send(preProcessResponse(markProtected(EntityTypes.shared_props, sharedPropsWithId)));
        }
    });
}
