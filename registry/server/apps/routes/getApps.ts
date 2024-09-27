import { Response } from 'express';
import Joi from 'joi';

import preProcessResponse from '../../common/services/preProcessResponse';
import { filtersMiddleware, RequestWithFilters } from '../../middleware/filters';
import { AppsGetListFilters, appsRepository } from '../repositories/AppsRepository';

const filtersSchema = Joi.object<AppsGetListFilters>({
    q: Joi.string().optional(),
    kind: Joi.alternatives(Joi.string(), Joi.array().items(Joi.string())),
    name: Joi.array().items(Joi.string()),
    id: Joi.array().items(Joi.string()),
    domainId: Joi.alternatives(Joi.number(), Joi.string().valid('null')),
});

const getApps = async (req: RequestWithFilters<AppsGetListFilters>, res: Response): Promise<void> => {
    const filters = req.filters ?? {};

    const { data, pagination } = await appsRepository.getList(filters, {
        // TODO: add a vlidating middleware to make sure it's a valid range
        range: req.query.range as string | undefined,
    });

    res.setHeader('Content-Range', pagination.total); //Stub for future pagination capabilities
    res.status(200).send(preProcessResponse(data));
};

export default [filtersMiddleware(filtersSchema), getApps];
