import { RequestHandler } from 'express';

import noticeError from '../../errorHandler/noticeError';
import { validated } from '../../common/validation/validated';
import renderTemplate from '../services/renderTemplate';
import errors from '../errors';
import { renderedTemplateQuerySchema, templateParamsSchema } from '../interfaces';
import type { TemplatesService } from '../services/TemplatesService';
import { getLogger } from '../../util/logger';
import { appendDigest } from '../../util/hmac';

export function getRenderedTemplate(service: TemplatesService): RequestHandler {
    return validated(
        { params: templateParamsSchema, query: renderedTemplateQuerySchema },
        async ({ params, query }, req, res) => {
            const { name: templateName } = params;

            const found = await service.getForRendering(templateName, query);

            if (!found) {
                res.status(404).send('Not found');
                return;
            }

            const template = { ...found.template, versionId: appendDigest(found.template.versionId, 'template') };

            try {
                const proxyHeaderNames = await service.getProxyHeaderNames();
                const forwardedHeaders =
                    proxyHeaderNames && proxyHeaderNames.length > 0
                        ? Object.fromEntries(
                              proxyHeaderNames
                                  .map((h) => h.toLowerCase())
                                  .filter((h): h is string => typeof req.headers[h] === 'string')
                                  .map((h) => [h, req.headers[h] as string]),
                          )
                        : undefined;
                const renderedTemplate = await renderTemplate(
                    found.content,
                    forwardedHeaders && Object.keys(forwardedHeaders).length > 0 ? { forwardedHeaders } : undefined,
                );
                res.status(200).send({ ...template, ...renderedTemplate });
            } catch (e) {
                if (e instanceof errors.FetchIncludeError) {
                    res.status(500).send(e.message);
                    noticeError(e, {
                        context: 'Error during fetch of the rendered template',
                    });
                    return;
                } else {
                    getLogger().error(e as Error, `Error on render template "${templateName}"`);
                    throw e;
                }
            }
        },
    );
}
