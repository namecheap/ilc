import express, { RequestHandler } from 'express';

import getTemplate from './getTemplate';
import getRenderedTemplate from './getRenderedTemplate';
import getTemplates from './getTemplates';
import updateTemplate from './updateTemplate';
import createTemplate from './createTemplate';
import deleteTemplate from './deleteTemplate';

export default (authMw: RequestHandler[]) => {
    const templatesRouter = express.Router();

    templatesRouter.get('/', authMw, ...getTemplates);
    templatesRouter.post('/', authMw, ...createTemplate);
    templatesRouter.get('/:name/rendered', ...getRenderedTemplate);
    templatesRouter.get('/:name', ...getTemplate);
    templatesRouter.put('/:name', authMw, ...updateTemplate);
    templatesRouter.delete('/:name', authMw, ...deleteTemplate);

    return templatesRouter;
};
