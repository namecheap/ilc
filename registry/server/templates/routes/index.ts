import express, { RequestHandler, Router } from 'express';

import type { TemplatesService } from '../services/TemplatesService';
import { getTemplate } from './getTemplate';
import { getRenderedTemplate } from './getRenderedTemplate';
import { getTemplates } from './getTemplates';
import { updateTemplate } from './updateTemplate';
import { createTemplate } from './createTemplate';
import { deleteTemplate } from './deleteTemplate';
import { upsertTemplateLocalizedVersion } from './upsertTemplateLocalizedVersion';
import { deleteTemplateLocalizedVersion } from './deleteTemplateLocalizedVersion';
import { partialUpdateTemplate } from './partialUpdateTemplate';

export function createTemplatesRouter(service: TemplatesService, authMw: RequestHandler[]): Router {
    const templatesRouter = express.Router();

    templatesRouter.get('/', authMw, getTemplates(service));
    templatesRouter.post('/', authMw, createTemplate(service));
    templatesRouter.get('/:name/rendered', getRenderedTemplate(service));
    templatesRouter.get('/:name', getTemplate(service));
    templatesRouter.put('/:name', authMw, updateTemplate(service));
    templatesRouter.patch('/:name', authMw, partialUpdateTemplate(service));
    templatesRouter.delete('/:name', authMw, deleteTemplate(service));
    templatesRouter.put('/:name/localized/:locale', authMw, upsertTemplateLocalizedVersion(service));
    templatesRouter.delete('/:name/localized/:locale', authMw, deleteTemplateLocalizedVersion(service));

    return templatesRouter;
}
