import { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { appendDigest } from '../../util/hmac';
import { templateSchema } from '../interfaces';
import type { TemplatesService } from '../services/TemplatesService';

export function createTemplate(service: TemplatesService): RequestHandler {
    return validated({ body: templateSchema }, async ({ body }, req, res) => {
        const result = await service.create(body, req.user);
        res.status(200).send({ ...result, versionId: appendDigest(result.versionId, 'template') });
    });
}
