import type { Knex } from 'knex';
import { Tables } from '../../db/structure';
import { EntityTypes, type VersionedRecord } from '../../versioning/interfaces';
import type { Versioning } from '../../versioning/services/Versioning';
import type { CreateSharedPropsInput, SharedPropsRow, UpdateSharedPropsInput } from '../interfaces';

export class SharedPropsRepository {
    constructor(private readonly versioning: Versioning) {}

    async list(): Promise<VersionedRecord<SharedPropsRow>[]> {
        return this.selectVersioned().orderBy(`${Tables.SharedProps}.name`, 'asc');
    }

    async findByName(name: string): Promise<VersionedRecord<SharedPropsRow> | undefined> {
        const [row] = await this.selectVersioned().where(`${Tables.SharedProps}.name`, name);
        return row;
    }

    async insert(sharedProps: CreateSharedPropsInput, trx: Knex.Transaction): Promise<SharedPropsRow> {
        const [row] = await trx(Tables.SharedProps).insert(sharedProps).returning('*');
        return row;
    }

    async update(
        name: string,
        sharedProps: UpdateSharedPropsInput,
        trx: Knex.Transaction,
    ): Promise<SharedPropsRow | undefined> {
        const [row] = await trx(Tables.SharedProps).where({ name }).update(sharedProps).returning('*');
        return row;
    }

    async delete(name: string, trx: Knex.Transaction): Promise<number> {
        return trx(Tables.SharedProps).where({ name }).delete();
    }

    private selectVersioned() {
        return this.versioning.versionedSelect(Tables.SharedProps, 'name', EntityTypes.shared_props, [
            `${Tables.SharedProps}.*`,
        ]);
    }
}
