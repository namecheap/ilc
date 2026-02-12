import { Knex } from 'knex';
import { PaginatedResult } from '../../../typings/PaginatedResult';
import db, { VersionedKnex } from '../../db';
import { Tables } from '../../db/structure';
import { appendDigest } from '../../util/hmac';
import { normalizeArray } from '../../util/normalizeArray';
import { EntityTypes } from '../../versioning/interfaces';
import { App } from '../interfaces';

export interface AppsGetListFilters {
    q?: string;
    kind?: string | string[];
    name?: string[];
    id?: string[];
    domainId?: number | 'null';
}

interface AppsGetListOptions {
    range?: string;
}

export class AppsRepository {
    constructor(private readonly db: VersionedKnex) {}

    async getList(filters: AppsGetListFilters, options: AppsGetListOptions): Promise<PaginatedResult<App>> {
        const { db } = this;
        const query = db.selectVersionedRowsFrom(Tables.Apps, 'name', EntityTypes.apps, [`${Tables.Apps}.*`]);

        this.addFilterByName(query, filters);
        this.addFilterByKind(query, filters);
        this.addFilterByQuery(query, filters);
        this.addFilterByDomainId(query, filters);

        const apps = await query.range(options.range as string | undefined);
        const itemsWithId = apps.data.map((item: any) => {
            return {
                ...item,
                versionId: appendDigest(item.versionId, 'app'),
            };
        });

        return {
            data: itemsWithId,
            pagination: apps.pagination,
        };
    }

    private addFilterByName(query: Knex.QueryBuilder, filters: AppsGetListFilters) {
        if (!filters.name && !filters.id) {
            return;
        }
        if (filters.id || filters.name) {
            query.whereIn(`${Tables.Apps}.name`, [...(filters.id ?? filters.name ?? [])]);
        }
    }

    private addFilterByKind(query: Knex.QueryBuilder, filters: AppsGetListFilters) {
        if (!filters.kind) {
            return;
        }
        const kind = normalizeArray(filters.kind);
        if (kind.length === 0) {
            return;
        }
        query.whereIn(`${Tables.Apps}.kind`, kind);
    }

    private addFilterByQuery(query: Knex.QueryBuilder, filters: AppsGetListFilters) {
        if (!filters.q) {
            return;
        }
        query.where(`${Tables.Apps}.name`, 'like', `%${filters.q}%`);
    }

    private addFilterByDomainId(query: Knex.QueryBuilder, filters: AppsGetListFilters) {
        const { db } = this;

        if (!filters.domainId) {
            return;
        }
        if (filters.domainId === 'null') {
            query
                .whereNotExists(function () {
                    this.select(1)
                        .from(Tables.RouteSlots)
                        .innerJoin(Tables.Routes, `${Tables.Routes}.id`, `${Tables.RouteSlots}.routeId`)
                        .where(`${Tables.RouteSlots}.appName`, db.ref(`${Tables.Apps}.name`))
                        .whereNotNull(`${Tables.Routes}.domainId`);
                })
                .where(`${Tables.Apps}.enforceDomain`, null);
        } else {
            query
                .leftJoin(Tables.RouteSlots, `${Tables.RouteSlots}.appName`, `${Tables.Apps}.name`)
                .leftJoin(Tables.Routes, `${Tables.Routes}.id`, `${Tables.RouteSlots}.routeId`)
                .where(function () {
                    this.where(`${Tables.Routes}.domainId`, filters.domainId).orWhere(
                        `${Tables.Apps}.enforceDomain`,
                        filters.domainId,
                    );
                })
                .groupBy(`${Tables.Apps}.name`)
                .groupBy('v.versionId');
        }
    }
}

// TODO: implement factory and IoC Container
export const appsRepository = new AppsRepository(db);
