import { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { templateContentSchema, templateParamsSchema } from '../interfaces';
import type { TemplatesService } from '../services/TemplatesService';

export function partialUpdateTemplate(service: TemplatesService): RequestHandler {
    return validated(
        { params: templateParamsSchema, body: templateContentSchema },
        async ({ params, body }, req, res) => {
            const template = await service.updateContent(params.name, body.content, req.user);
            res.status(200).send(template);
        },
    );
}
