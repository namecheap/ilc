import type { Knex } from 'knex';

import versioningService, { OperationConfig } from '../versioning/services/Versioning';
import { Tables } from './structure';
import { isPostgres } from '../util/db';
import { EntityTypes, VersionedRecord } from '../versioning/interfaces';
import { User } from '../../typings/User';

type ColumnDescriptor = Knex.ColumnDescriptor<{}, {}[]>;

interface SelectVersioned<TRecord extends {} = any, TResult = unknown[]> extends Knex.QueryInterface<TRecord, TResult> {
    <TTable extends Knex.TableNames>(
        table: TTable,
        key: string,
        entityType: EntityTypes,
        columns: ColumnDescriptor[],
    ): Knex.QueryBuilder<Knex.TableType<TTable>, VersionedRecord<Knex.ResolveTableType<Knex.TableType<TTable>>>[]>;
    <TResult2 = TResult>(
        table: Knex.TableDescriptor | Knex.AliasDict,
        key: string,
        entityType: EntityTypes,
        columns: ColumnDescriptor[],
    ): Knex.QueryBuilder<TRecord, VersionedRecord<TResult2>>;
}

interface SelectVersionedRows<TRecord extends {} = any, TResult = unknown[]> extends Knex.QueryInterface<
    TRecord,
    TResult
> {
    <TTable extends Knex.TableNames>(
        table: TTable,
        key: string,
        entityType: EntityTypes,
        columns: ColumnDescriptor[],
    ): Knex.QueryBuilder<Knex.TableType<TTable>, VersionedRecord<Knex.ResolveTableType<Knex.TableType<TTable>>>[]>;
    <TResult2 = TResult>(
        table: Knex.TableDescriptor | Knex.AliasDict,
        key: string,
        entityType: EntityTypes,
        columns: ColumnDescriptor[],
    ): Knex.QueryBuilder<TRecord, VersionedRecord<TResult2>[]>;
}

export interface VersionedKnex<TRecord extends {} = any, TResult = any> extends Knex {
    versioning(
        user: User | undefined,
        conf: OperationConfig,
        callback: (transaction: Knex.Transaction) => Promise<void | number>,
    ): Promise<number>;

    selectVersioned: SelectVersioned<TRecord, TResult>;
    selectVersionedRows: SelectVersionedRows<TRecord, TResult>;
    selectVersionedRowsFrom: SelectVersionedRows<TRecord, TResult>;
}

function selectVersionedRows(knex: VersionedKnex) {
    return function (table: Knex.TableNames, key: string, entityType: EntityTypes, columns: ColumnDescriptor[]) {
        // char(255) is the one cast sqlite, mysql and postgresql all accept, but postgresql reads it as bpchar
        // and then cannot use versioning_entity_idx; varchar keeps this a per-row index probe there
        const castType = isPostgres(knex) ? 'varchar(255)' : 'char(255)';
        const latestVersionId = knex
            .max('id')
            .from(`${Tables.Versioning} as v`)
            .where('v.entity_type', entityType)
            .whereRaw(`v.entity_id = CAST(${table}.${key} AS ${castType})`)
            .as('versionId');

        return knex.select([...columns, latestVersionId]);
    };
}

function selectVersionedRowsFrom(knex: VersionedKnex) {
    return function (table: Knex.TableNames, key: string, entityType: EntityTypes, columns: ColumnDescriptor[]) {
        return knex.selectVersionedRows(table, key, entityType, columns).from(table);
    };
}

export default function (knex: Knex | any): VersionedKnex {
    if (knex.versioning) {
        return knex;
    }

    versioningService.setDb(knex);
    knex.versioning = versioningService.logOperation;
    knex.selectVersioned = selectVersionedRows(knex);
    knex.selectVersionedRows = selectVersionedRows(knex);
    knex.selectVersionedRowsFrom = selectVersionedRowsFrom(knex);

    return knex;
}
