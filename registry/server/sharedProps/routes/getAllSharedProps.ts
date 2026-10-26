import { RequestHandler } from 'express';

import { preProcessResponse } from '../../common/services/preProcessResponse';
import { markProtected } from '../../common/services/protectedEntities';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import type { SharedPropsService } from '../services/SharedPropsService';

export function getAllSharedProps(service: SharedPropsService): RequestHandler {
    return async (req, res) => {
        const sharedProps = await service.list();
        const sharedPropsWithId = sharedProps.map((item) => {
            return { ...item, versionId: appendDigest(item.versionId, 'sharedProp') };
        });

        res.setHeader('Content-Range', sharedPropsWithId.length); //Stub for future pagination capabilities
        res.status(200).send(preProcessResponse(markProtected(EntityTypes.shared_props, sharedPropsWithId)));
    };
}
