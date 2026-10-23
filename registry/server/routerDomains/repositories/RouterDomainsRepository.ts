import type { Knex } from 'knex';
import type { PaginatedResult } from '../../../typings/PaginatedResult';
import { Tables } from '../../db/structure';
import { DBError } from '../../errorHandler/httpErrors';
import { handleForeignConstraintError } from '../../util/db';
import { EntityTypes, type VersionedRecord } from '../../versioning/interfaces';
import type { Versioning } from '../../versioning/services/Versioning';
import type { RouterDomainsInput, RouterDomainsRow } from '../interfaces';

export class RouterDomainsRepository {
    constructor(
        private readonly db: Knex,
        private readonly versioning: Versioning,
    ) {}

    async list(range: string | undefined): Promise<PaginatedResult<VersionedRecord<RouterDomainsRow>>> {
        return this.selectVersioned().orderBy(`${Tables.RouterDomains}.id`, 'asc').range(range);
    }

    async findById(id: number): Promise<VersionedRecord<RouterDomainsRow> | undefined> {
        const [row] = await this.selectVersioned().where(`${Tables.RouterDomains}.id`, id);
        return row;
    }

    async findIdByDomainName(domainName: string): Promise<number | undefined> {
        const row = await this.db(Tables.RouterDomains).where({ domainName }).first('id');
        return row?.id;
    }

    async findIdByAlias(alias: string): Promise<number | undefined> {
        const row = await this.db(Tables.RouterDomains).where({ alias }).first('id');
        return row?.id;
    }

    async insert(routerDomain: RouterDomainsInput, trx: Knex.Transaction): Promise<RouterDomainsRow> {
        const [row] = await trx(Tables.RouterDomains).insert(routerDomain).returning('*');
        return row;
    }

    async update(
        id: number,
        routerDomain: RouterDomainsInput,
        trx: Knex.Transaction,
    ): Promise<RouterDomainsRow | undefined> {
        const [row] = await trx(Tables.RouterDomains).where({ id }).update(routerDomain).returning('*');
        return row;
    }

    async countReferences(id: number, trx: Knex.Transaction): Promise<{ routes: number; apps: number }> {
        const [[routes], [apps]] = await Promise.all([
            trx(Tables.Routes).where('domainId', id).count<{ count: string | number }[]>('id as count'),
            trx(Tables.Apps).where('enforceDomain', id).count<{ count: string | number }[]>('name as count'),
        ]);

        return { routes: Number(routes.count), apps: Number(apps.count) };
    }

    async delete(id: number, trx: Knex.Transaction): Promise<number> {
        try {
            // Domain-scoped setting values are meaningless without the domain, so they are removed along with it
            await trx('settings_domain_value').where('domainId', id).delete();
            return await trx(Tables.RouterDomains).where({ id }).delete();
        } catch (e: unknown) {
            if (!(e instanceof Error)) {
                throw e;
            }
            handleForeignConstraintError(e);
            throw new DBError({ message: e.message });
        }
    }

    private selectVersioned() {
        return this.versioning.versionedSelect(Tables.RouterDomains, 'id', EntityTypes.router_domains, [
            `${Tables.RouterDomains}.*`,
        ]);
    }
}
