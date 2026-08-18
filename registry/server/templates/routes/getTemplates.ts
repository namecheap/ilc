import { Response } from 'express';
import Joi from 'joi';

import { markProtected } from '../../common/services/protectedEntities';
import { filtersMiddleware, RequestWithFilters } from '../../middleware/filters';
import { EntityTypes } from '../../versioning/interfaces';
import { TemplatesGetListFilters, templatesRepository } from '../services/templatesRepository';

const filtersSchema = Joi.object<TemplatesGetListFilters>({
    domainId: Joi.alternatives(Joi.number(), Joi.string().valid('null')).optional(),
    id: Joi.alternatives(Joi.string(), Joi.array().items(Joi.string())).optional(),
    name: Joi.alternatives(Joi.string(), Joi.array().items(Joi.string())).optional(),
});

const getTemplates = async (req: RequestWithFilters<TemplatesGetListFilters>, res: Response): Promise<void> => {
    const { data, pagination } = await templatesRepository.getList(req.filters ?? {});
    res.setHeader('Content-Range', pagination.total); //Stub for future pagination capabilities
    res.status(200).send(markProtected(EntityTypes.templates, data));
};

export default [filtersMiddleware(filtersSchema), getTemplates];
