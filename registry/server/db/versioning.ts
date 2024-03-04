import type { Knex } from 'knex';

import versioningService, { OperationConf } from '../versioning/services/Versioning';
import { Tables } from './structure';
import { EntityTypes, VersionedRecord } from '../versioning/interfaces';

type ColumnDescriptor = Knex.ColumnDescriptor<{}, {}[]>;

interface SelectVersioned<TRecord extends {} = any, TResult = unknown> {
    <TResult2 = TResult> (
        table: string,
        key: string,
        entityType: EntityTypes,
        columns: ColumnDescriptor[],
    ): Knex.QueryBuilder<TRecord, VersionedRecord<TResult2>>;
}

interface SelectVersionedRows<TRecord extends {} = any, TResult = unknown> {
    <TResult2 = TResult> (
        table: string,
        key: string,
        entityType: EntityTypes,
        columns: ColumnDescriptor[],
    ): Knex.QueryBuilder<TRecord, VersionedRecord<TResult2>[]>;
}

export interface VersionedKnex<TRecord extends {} = any, TResult = any> extends Knex {
    versioning(
        user: any,
        conf: OperationConf,
        callback: (transaction: Knex.Transaction) => Promise<void | number>,
    ): Promise<number>;

    selectVersioned: SelectVersioned<TRecord, TResult>;
    selectVersionedRows: SelectVersionedRows<TRecord, TResult>;
    selectVersionedRowsFrom: SelectVersionedRows<TRecord, TResult>;
}

function selectVersionedRows(knex: VersionedKnex) {
    return function(table: string, key: string, entityType: EntityTypes, columns: ColumnDescriptor[]) {
        const versionIdQuery = knex
            .table(Tables.Versioning)
            .max('id').as('versionId')
            .where('entity_id', knex.raw(`cast(${table}.${key} as char)`))
            .andWhere('entity_type', entityType);
        return knex.select.call(knex, columns.concat([versionIdQuery]));
    }
}

function selectVersionedRowsFrom(knex: VersionedKnex) {
    return function(table: string, key: string, entityType: EntityTypes, columns: ColumnDescriptor[]) {
        return knex
            .selectVersionedRows(table, key, entityType, columns)
            .from(table);
    }
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
