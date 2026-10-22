import type { Knex } from 'knex';

import versioningService, { OperationConfig } from '../versioning/services/Versioning';
import { selectVersionedRows, selectVersionedRowsFrom } from '../versioning/services/selectVersionedRows';
import { EntityTypes, VersionedRecord } from '../versioning/interfaces';
import { User } from '../../typings/User';

type ColumnDescriptor = Knex.ColumnDescriptor<{}, {}[]>;
type SelectVersionedArgs = [table: Knex.TableNames, key: string, entityType: EntityTypes, columns: ColumnDescriptor[]];

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

export default function (knex: Knex | any): VersionedKnex {
    if (knex.versioning) {
        return knex;
    }

    versioningService.setDb(knex);
    knex.versioning = versioningService.logOperation;
    knex.selectVersioned = (...args: SelectVersionedArgs) => selectVersionedRows(knex, ...args);
    knex.selectVersionedRows = (...args: SelectVersionedArgs) => selectVersionedRows(knex, ...args);
    knex.selectVersionedRowsFrom = (...args: SelectVersionedArgs) => selectVersionedRowsFrom(knex, ...args);

    return knex;
}
