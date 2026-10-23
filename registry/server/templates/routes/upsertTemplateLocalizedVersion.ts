import { RequestHandler } from 'express';

import { validated } from '../../common/validation/validated';
import { localizedVersionParamsSchema, localizedVersionSchema } from '../interfaces';
import type { TemplatesService } from '../services/TemplatesService';

export function upsertTemplateLocalizedVersion(service: TemplatesService): RequestHandler {
    return validated(
        { params: localizedVersionParamsSchema, body: localizedVersionSchema },
        async ({ params, body }, req, res) => {
            const localizedVersion = await service.upsertLocalizedVersion(params.name, params.locale, body);
            res.status(200).send(localizedVersion);
        },
    );
}
