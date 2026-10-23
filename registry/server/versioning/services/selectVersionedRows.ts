import type { Knex } from 'knex';
import { Tables } from '../../db/structure';
import type { EntityTypes, VersionedRecord } from '../interfaces';

type ColumnDescriptor = Knex.ColumnDescriptor<{}, {}[]>;

function selectVersionedRows(
    db: Knex,
    table: Knex.TableNames,
    key: string,
    entityType: EntityTypes,
    columns: ColumnDescriptor[],
) {
    return db
        .leftJoin(
            db
                .select('entity_id')
                .from(Tables.Versioning)
                .max('id', { as: 'versionId' })
                .where({ entity_type: entityType })
                .groupBy('entity_id')
                .as('v'),
            'v.entity_id',
            // versioning.entity_id is a string, while some keys are integers
            db.raw('??::text', [`${table}.${key}`]),
        )
        .select([...columns, 'versionId']);
}

/**
 * Selects the columns along with the id of the latest version of each row as "versionId".
 * Rows are typed from the table, a query that joins other tables or aliases columns
 * passes its row type as TResult, as with Knex's select<T>()
 */
export function selectVersionedRowsFrom<
    TTable extends Knex.TableNames,
    TResult = VersionedRecord<Knex.ResolveTableType<Knex.TableType<TTable>>>,
>(
    db: Knex,
    table: TTable,
    key: string,
    entityType: EntityTypes,
    columns: ColumnDescriptor[],
): Knex.QueryBuilder<Knex.TableType<TTable>, TResult[]> {
    return selectVersionedRows(db, table, key, entityType, columns).from(table);
}
