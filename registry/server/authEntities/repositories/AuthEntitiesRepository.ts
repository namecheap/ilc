import type { Knex } from 'knex';
import { Tables } from '../../db/structure';
import { EntityTypes, type VersionedRecord } from '../../versioning/interfaces';
import type { Versioning } from '../../versioning/services/Versioning';
import type { AuthEntityRow, CreateAuthEntityInput, UpdateAuthEntityInput } from '../interfaces';

export class AuthEntitiesRepository {
    constructor(private readonly versioning: Versioning) {}

    async list(): Promise<VersionedRecord<AuthEntityRow>[]> {
        return this.selectVersioned().orderBy(`${Tables.AuthEntities}.id`, 'asc');
    }

    async findById(id: number): Promise<VersionedRecord<AuthEntityRow> | undefined> {
        const [row] = await this.selectVersioned().where(`${Tables.AuthEntities}.id`, id);
        return row;
    }

    async insert(authEntity: CreateAuthEntityInput, trx: Knex.Transaction): Promise<AuthEntityRow> {
        const [row] = await trx(Tables.AuthEntities).insert(authEntity).returning('*');
        return row;
    }

    async update(
        id: number,
        authEntity: UpdateAuthEntityInput,
        trx: Knex.Transaction,
    ): Promise<AuthEntityRow | undefined> {
        const [row] = await trx(Tables.AuthEntities).where({ id }).update(authEntity).returning('*');
        return row;
    }

    async delete(id: number, trx: Knex.Transaction): Promise<number> {
        return trx(Tables.AuthEntities).where({ id }).delete();
    }

    private selectVersioned() {
        return this.versioning.versionedSelect(Tables.AuthEntities, 'id', EntityTypes.auth_entities, [
            `${Tables.AuthEntities}.*`,
        ]);
    }
}
