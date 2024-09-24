import { Response } from 'express';
import Joi from 'joi';
import preProcessResponse from '../../common/services/preProcessResponse';
import db from '../../db';
import { Tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import App from '../interfaces';
import { RequestWithFilters, filtersMiddleware } from '../../middleware/filters';

interface Filters {
    q?: string;
    kind?: string | string[];
    name?: string[];
    id?: string[];
    domainId?: number | 'null';
}

const filtersSchema = Joi.object<Filters>({
    q: Joi.string().optional(),
    kind: Joi.alternatives(Joi.string(), Joi.array().items(Joi.string())),
    name: Joi.array().items(Joi.string()),
    id: Joi.array().items(Joi.string()),
    domainId: Joi.alternatives(Joi.number(), Joi.string().valid('null')),
});

const getApps = async (req: RequestWithFilters<Filters>, res: Response): Promise<void> => {
    const filters = req.filters ?? {};

    const query = db.selectVersionedRowsFrom<App>(Tables.Apps, 'name', EntityTypes.apps, [`${Tables.Apps}.*`]);
    if (filters.id || filters.name) {
        query.whereIn('name', [...(filters.id ?? filters.name ?? [])]);
    }
    if (typeof filters.kind === 'string') {
        query.where('kind', filters.kind);
    } else if (Array.isArray(filters.kind)) {
        query.whereIn('kind', filters.kind);
    }
    if (filters.q) {
        query.where('name', 'like', `%${filters.q}%`);
    }
    if (filters.domainId) {
        if (filters.domainId === 'null') {
            query.whereNotExists(function () {
                this.select(1)
                    .from(Tables.RouteSlots)
                    .innerJoin(Tables.Routes, `${Tables.Routes}.id`, `${Tables.RouteSlots}.routeId`)
                    .where(`${Tables.RouteSlots}.appName`, db.ref(`${Tables.Apps}.name`))
                    .whereNotNull(`${Tables.Routes}.domainId`);
            });
        } else {
            query
                .innerJoin(Tables.RouteSlots, `${Tables.RouteSlots}.appName`, `${Tables.Apps}.name`)
                .innerJoin(Tables.Routes, `${Tables.Routes}.id`, `${Tables.RouteSlots}.routeId`)
                .where(`${Tables.Routes}.domainId`, filters.domainId)
                .groupBy(`${Tables.Apps}.name`)
                .groupBy('v.versionId');
        }
    }

    const apps = await query.range(req.query.range as string | undefined);
    const itemsWithId = apps.data.map((item: any) => {
        return { ...item, versionId: appendDigest(item.versionId, 'app') };
    });

    res.setHeader('Content-Range', apps.pagination.total); //Stub for future pagination capabilities
    res.status(200).send(preProcessResponse(itemsWithId));
};

export default [filtersMiddleware(filtersSchema), getApps];
