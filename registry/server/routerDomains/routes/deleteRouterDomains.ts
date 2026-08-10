import { Request, Response } from 'express';
import Joi from 'joi';

import db from '../../db';
import validateRequestFactory from '../../common/services/validateRequest';
import { routerDomainIdSchema } from '../interfaces';
import * as httpErrors from '../../errorHandler/httpErrors';
import { handleForeignConstraintError } from '../../util/db';

type RequestParams = {
    id: string;
};

const validateRequest = validateRequestFactory([
    {
        schema: Joi.object({
            id: routerDomainIdSchema,
        }),
        selector: 'params',
    },
]);

const deleteRouterDomains = async (req: Request<RequestParams>, res: Response): Promise<void> => {
    const domainId = req.params.id;

    await db.versioning(req.user, { type: 'router_domains', id: domainId }, async (trx) => {
        const [[routes], [apps]] = await Promise.all([
            db
                .from<{ count: string | number }>('routes')
                .where('domainId', domainId)
                .count('id as count')
                .transacting(trx),
            db
                .from<{ count: string | number }>('apps')
                .where('enforceDomain', domainId)
                .count('name as count')
                .transacting(trx),
        ]);

        const routesCount = Number(routes.count);
        const appsCount = Number(apps.count);

        if (routesCount || appsCount) {
            const usedBy = [
                routesCount && `${routesCount} route(s)`,
                appsCount && `${appsCount} app(s) via "enforceDomain"`,
            ]
                .filter(Boolean)
                .join(' and ');

            throw new httpErrors.ConflictError({
                message: `Unable to delete router domain: it is referenced by ${usedBy}. Remove or reassign them first.`,
            });
        }

        let count;
        try {
            // Domain-scoped setting values are meaningless without the domain, so they are removed along with it
            await db('settings_domain_value').where('domainId', domainId).delete().transacting(trx);
            count = await db('router_domains').where('id', domainId).delete().transacting(trx);
        } catch (e: any) {
            handleForeignConstraintError(e);
            throw new httpErrors.DBError({ message: e.message });
        }

        if (!count) {
            throw new httpErrors.NotFoundError();
        }
    });

    res.status(204).send();
};

export default [validateRequest, deleteRouterDomains];
