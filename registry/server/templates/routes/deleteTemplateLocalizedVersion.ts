import { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { localizedVersionParamsSchema } from '../interfaces';
import type { TemplatesService } from '../services/TemplatesService';

export function deleteTemplateLocalizedVersion(service: TemplatesService): RequestHandler {
    return validated({ params: localizedVersionParamsSchema }, async ({ params }, req, res) => {
        await service.deleteLocalizedVersion(params.name, params.locale);

        res.status(204).send();
    });
}
