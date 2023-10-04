import type Knex from 'knex';
import { isPostgres } from '../util/db';

export function syncSequencePlugin(knex: typeof Knex): void {
    knex.QueryBuilder.extend('syncSequence', function syncSequence(column = 'id') {
        if (isPostgres(this)) {
            const table: string = this.client.queryCompiler(this).tableName.replaceAll('"', '');
            return this.client.raw(
                `SELECT setval(pg_get_serial_sequence('${table}', '${column}'), COALESCE(max("${column}") + 1, 1), false) FROM "${table}";`,
            );
        }
    });
}
