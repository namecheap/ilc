import { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { appendDigest } from '../../util/hmac';
import { partialTemplateSchema, templateParamsSchema } from '../interfaces';
import type { TemplatesService } from '../services/TemplatesService';

export function updateTemplate(service: TemplatesService): RequestHandler {
    return validated(
        { params: templateParamsSchema, body: partialTemplateSchema },
        async ({ params, body }, req, res) => {
            const template = await service.update(params.name, body, req.user);
            res.status(200).send({ ...template, versionId: appendDigest(template.versionId, 'template') });
        },
    );
}
