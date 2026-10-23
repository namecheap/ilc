import { RequestHandler } from 'express';

import { markProtected } from '../../common/services/protectedEntities';
import { validated } from '../../common/validation/validated';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import { templateParamsSchema } from '../interfaces';
import type { TemplatesService } from '../services/TemplatesService';

export function getTemplate(service: TemplatesService): RequestHandler {
    return validated({ params: templateParamsSchema }, async ({ params }, req, res) => {
        const template = await service.get(params.name);

        if (!template) {
            res.status(404).send('Not found');
            return;
        }

        const templateWithId = { ...template, versionId: appendDigest(template.versionId, 'template') };
        res.status(200).send(markProtected(EntityTypes.templates, templateWithId));
    });
}
