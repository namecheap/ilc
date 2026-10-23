import type { Knex } from 'knex';
import { PaginatedResult } from '../../../typings/PaginatedResult';
import { Tables } from '../../db/structure';
import { EntityTypes, type VersionedRecord } from '../../versioning/interfaces';
import type { Versioning } from '../../versioning/services/Versioning';
import type { PartialSharedLibInput, SharedLibRow, SharedLibsFilters } from '../interfaces';

export type SharedLibInsert = Omit<SharedLibRow, 'assetsDiscoveryUpdatedAt' | 'adminNotes' | 'l10nManifest'> &
    Partial<Pick<SharedLibRow, 'adminNotes' | 'l10nManifest'>>;

export class SharedLibsRepository {
    constructor(
        private readonly db: Knex,
        private readonly versioning: Versioning,
    ) {}

    async list(
        filters: SharedLibsFilters,
        range: string | undefined,
    ): Promise<PaginatedResult<VersionedRecord<SharedLibRow>>> {
        const query = this.selectVersioned().orderBy(`${Tables.SharedLibs}.name`, 'asc');

        if (filters.name) {
            query.whereLike(`${Tables.SharedLibs}.name`, `%${filters.name}%`);
        }

        return query.range(range);
    }

    async findByName(name: string): Promise<VersionedRecord<SharedLibRow> | undefined> {
        const [row] = await this.selectVersioned().where(`${Tables.SharedLibs}.name`, name);
        return row;
    }

    async exists(name: string): Promise<boolean> {
        return (await this.db(Tables.SharedLibs).where({ name }).first('name')) !== undefined;
    }

    async insert(sharedLib: SharedLibInsert, trx: Knex.Transaction): Promise<SharedLibRow> {
        const [row] = await trx(Tables.SharedLibs).insert(sharedLib).returning('*');
        return row;
    }

    async update(
        name: string,
        sharedLib: PartialSharedLibInput,
        trx: Knex.Transaction,
    ): Promise<SharedLibRow | undefined> {
        const [row] = await trx(Tables.SharedLibs).where({ name }).update(sharedLib).returning('*');
        return row;
    }

    async upsert(sharedLib: SharedLibInsert, trx: Knex.Transaction): Promise<void> {
        await trx(Tables.SharedLibs).insert(sharedLib).onConflict('name').merge();
    }

    async delete(name: string, trx: Knex.Transaction): Promise<number> {
        return trx(Tables.SharedLibs).where({ name }).delete();
    }

    private selectVersioned() {
        return this.versioning.versionedSelect(Tables.SharedLibs, 'name', EntityTypes.shared_libs, [
            `${Tables.SharedLibs}.*`,
        ]);
    }
}
