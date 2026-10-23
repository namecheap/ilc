import { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { templateParamsSchema } from '../interfaces';
import type { TemplatesService } from '../services/TemplatesService';

export function deleteTemplate(service: TemplatesService): RequestHandler {
    return validated({ params: templateParamsSchema }, async ({ params }, req, res) => {
        await service.delete(params.name, req.user);

        res.status(204).send();
    });
}
