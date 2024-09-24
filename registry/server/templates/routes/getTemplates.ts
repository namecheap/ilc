import { query, Request, Response } from 'express';

import db from '../../db';
import Template from '../interfaces';
import { Tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';
import { EntityTypes } from '../../versioning/interfaces';
import Joi from 'joi';
import { filtersMiddleware, RequestWithFilters } from '../../middleware/filters';

interface Filters {
    domainId?: number | 'null';
}

const filtersSchema = Joi.object<Filters>({
    domainId: Joi.alternatives(Joi.number(), Joi.string().valid('null')).optional(),
});

const getTemplates = async (req: RequestWithFilters<Filters>, res: Response): Promise<void> => {
    const query = db.selectVersionedRowsFrom<Template>(Tables.Templates, 'name', EntityTypes.templates, [
        `${Tables.Templates}.*`,
    ]);

    if (req.filters?.domainId) {
        if (req.filters.domainId === 'null') {
            query.whereNotExists(function () {
                this.select(1)
                    .from(Tables.Routes)
                    .where(`${Tables.Routes}.templateName`, db.ref(`${Tables.Templates}.name`))
                    .whereNotNull(`${Tables.Routes}.domainId`);
            });
        } else {
            query
                .distinct()
                .innerJoin(Tables.Routes, `${Tables.Routes}.templateName`, `${Tables.Templates}.name`)
                .where(`${Tables.Routes}.domainId`, req.filters.domainId);
        }
    }

    const templates = await query;

    const itemsWithId = templates.map((item) => {
        return { ...item, versionId: appendDigest(item.versionId, 'template') };
    });

    res.setHeader('Content-Range', templates.length); //Stub for future pagination capabilities
    res.status(200).send(itemsWithId);
};

export default [filtersMiddleware(filtersSchema), getTemplates];
