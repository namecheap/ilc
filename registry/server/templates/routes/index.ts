import express from 'express';

import getTemplate from './getTemplate';
import getRenderedTemplate from './getRenderedTemplate'
import getTemplates from './getTemplates';
import updateTemplate from './updateTemplate';
import createTemplate from './createTemplate';
import deleteTemplate from './deleteTemplate';

const templatesRouter = express.Router();

templatesRouter.get('/', ...getTemplates);
templatesRouter.post('/', ...createTemplate);
templatesRouter.get('/:name/rendered', ...getRenderedTemplate)
templatesRouter.get('/:name', ...getTemplate);
templatesRouter.put('/:name', ...updateTemplate);
templatesRouter.delete('/:name', ...deleteTemplate);

export default templatesRouter;
