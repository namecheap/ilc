import { Knex } from 'knex';
import { PaginatedResult } from '../../../typings/PaginatedResult';
import { Tables } from '../../db/structure';
import { normalizeArray } from '../../util/normalizeArray';
import { EntityTypes, type VersionedRecord } from '../../versioning/interfaces';
import type { Versioning } from '../../versioning/services/Versioning';
import type { AppRow, AppsFilters } from '../interfaces';

export type AppInsert = Omit<
    AppRow,
    'assetsDiscoveryUpdatedAt' | 'spaBundle' | 'cssBundle' | 'adminNotes' | 'l10nManifest'
> &
    Partial<Pick<AppRow, 'spaBundle' | 'cssBundle' | 'adminNotes' | 'l10nManifest'>>;
export type AppUpdate = Partial<Omit<AppRow, 'name' | 'assetsDiscoveryUpdatedAt'>>;

export class AppsRepository {
    constructor(
        private readonly db: Knex,
        private readonly versioning: Versioning,
    ) {}

    async getList(filters: AppsFilters, range: string | undefined): Promise<PaginatedResult<VersionedRecord<AppRow>>> {
        const query = this.selectVersioned();

        this.addFilterByName(query, filters);
        this.addFilterByKind(query, filters);
        this.addFilterByQuery(query, filters);
        this.addFilterByDomainId(query, filters);

        query.orderBy(`${Tables.Apps}.name`, 'asc');

        return query.range(range);
    }

    async findByName(name: string): Promise<VersionedRecord<AppRow> | undefined> {
        const [row] = await this.selectVersioned().where(`${Tables.Apps}.name`, name);
        return row;
    }

    async findKind(name: string): Promise<AppRow['kind'] | undefined> {
        const app = await this.db(Tables.Apps).where({ name }).first('kind');
        return app?.kind;
    }

    async findNamesByNamespace(namespace: string, excludeNames: string[], trx: Knex.Transaction): Promise<string[]> {
        const apps = await trx(Tables.Apps).where({ namespace }).whereNotIn('name', excludeNames).select('name');
        return apps.map((app) => app.name);
    }

    async insert(app: AppInsert, trx: Knex.Transaction): Promise<AppRow> {
        const [row] = await trx(Tables.Apps).insert(app).returning('*');
        return row;
    }

    /** Insert, or replace the app with the same name in the namespace */
    async upsert(app: AppInsert, trx: Knex.Transaction): Promise<AppRow> {
        const [row] = await trx(Tables.Apps)
            .insert(app)
            .onConflict(this.db.raw('(name, namespace) WHERE namespace IS NOT NULL'))
            .merge()
            .returning('*');
        return row;
    }

    async update(name: string, app: AppUpdate, trx: Knex.Transaction): Promise<AppRow | undefined> {
        const [row] = await trx(Tables.Apps).where({ name }).update(app).returning('*');
        return row;
    }

    async delete(name: string, trx: Knex.Transaction): Promise<number> {
        return trx(Tables.Apps).where({ name }).delete();
    }

    private selectVersioned() {
        return this.versioning.versionedSelect(Tables.Apps, 'name', EntityTypes.apps, [`${Tables.Apps}.*`]);
    }

    private addFilterByName(query: Knex.QueryBuilder, filters: AppsFilters) {
        if (!filters.name && !filters.id) {
            return;
        }
        if (filters.id || filters.name) {
            query.whereIn(`${Tables.Apps}.name`, [...(filters.id ?? filters.name ?? [])]);
        }
    }

    private addFilterByKind(query: Knex.QueryBuilder, filters: AppsFilters) {
        if (!filters.kind) {
            return;
        }
        const kind = normalizeArray(filters.kind);
        if (kind.length === 0) {
            return;
        }
        query.whereIn(`${Tables.Apps}.kind`, kind);
    }

    private addFilterByQuery(query: Knex.QueryBuilder, filters: AppsFilters) {
        if (!filters.q) {
            return;
        }
        query.where(`${Tables.Apps}.name`, 'like', `%${filters.q}%`);
    }

    private addFilterByDomainId(query: Knex.QueryBuilder, filters: AppsFilters) {
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
