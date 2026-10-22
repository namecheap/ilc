import type { Knex } from 'knex';

import { Versioning } from '../versioning/services/Versioning';
import versioningConfig from '../versioning/config';
import { selectVersionedRows, selectVersionedRowsFrom } from '../versioning/services/selectVersionedRows';
import { EntityTypes, VersionedRecord } from '../versioning/interfaces';

type ColumnDescriptor = Knex.ColumnDescriptor<{}, {}[]>;
type SelectVersionedArgs = [table: Knex.TableNames, key: string, entityType: EntityTypes, columns: ColumnDescriptor[]];

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
    versioning: Versioning['logOperation'];

    selectVersionedRows: SelectVersionedRows<TRecord, TResult>;
    selectVersionedRowsFrom: SelectVersionedRows<TRecord, TResult>;
}

export default function (knex: Knex | any): VersionedKnex {
    if (knex.versioning) {
        return knex;
    }

    knex.versioning = new Versioning(versioningConfig, knex).logOperation;
    knex.selectVersionedRows = (...args: SelectVersionedArgs) => selectVersionedRows(knex, ...args);
    knex.selectVersionedRowsFrom = (...args: SelectVersionedArgs) => selectVersionedRowsFrom(knex, ...args);

    return knex;
}
