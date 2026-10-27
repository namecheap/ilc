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
    // one probe of versioning_entity_idx per row: joining a grouped subquery instead would aggregate the whole
    // history of the entity type on every read
    const latestVersionId = db
        .max('id')
        .from(`${Tables.Versioning} as v`)
        .where('v.entity_type', entityType)
        // versioning.entity_id is a string, while some keys are integers
        .where('v.entity_id', db.raw('??::text', [`${table}.${key}`]))
        .as('versionId');

    return db.select([...columns, latestVersionId]);
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
