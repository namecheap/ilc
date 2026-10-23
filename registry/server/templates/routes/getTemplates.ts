import { RequestHandler } from 'express';

import { markProtected } from '../../common/services/protectedEntities';
import { validated } from '../../common/validation/validated';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import { templatesFiltersSchema } from '../interfaces';
import type { TemplatesService } from '../services/TemplatesService';

export function getTemplates(service: TemplatesService): RequestHandler {
    return validated({ filters: templatesFiltersSchema }, async ({ filters }, req, res) => {
        const templates = await service.list(filters);
        const itemsWithId = templates.map((item) => {
            return { ...item, versionId: appendDigest(item.versionId, 'template') };
        });

        res.setHeader('Content-Range', itemsWithId.length); //Stub for future pagination capabilities
        res.status(200).send(markProtected(EntityTypes.templates, itemsWithId));
    });
}
