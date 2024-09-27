import { Response } from 'express';
import Joi from 'joi';

import preProcessResponse from '../../common/services/preProcessResponse';
import { filtersMiddleware, RequestWithFilters } from '../../middleware/filters';
import { SharedLibsGetListFilters, sharedLibsRepository } from '../repositories/SharedLibsRepository';

const filtersSchema = Joi.object<SharedLibsGetListFilters>({
    name: Joi.string().optional(),
});

const getSharedLibs = async (req: RequestWithFilters<SharedLibsGetListFilters>, res: Response): Promise<void> => {
    const { data: sharedLibs, pagination } = await sharedLibsRepository.getList(req.filters ?? {}, {
        range: req.query.range as string | undefined,
    });

    res.setHeader('Content-Range', pagination.total);
    res.status(200).send(preProcessResponse(sharedLibs));
};

export default [filtersMiddleware(filtersSchema), getSharedLibs];
