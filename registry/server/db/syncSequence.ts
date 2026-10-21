import type Knex from 'knex';

export function syncSequencePlugin(knex: typeof Knex): void {
    knex.QueryBuilder.extend('syncSequence', function syncSequence(column = 'id', step = 1, defaultValue = 1) {
        const table: string = this.client.queryCompiler(this).tableName.replaceAll('"', '');
        return this.client.raw(
            `SELECT setval(pg_get_serial_sequence('${table}', '${column}'), COALESCE(max("${column}") + ${step}, ${defaultValue}), false) FROM "${table}"`,
        );
    });
}
