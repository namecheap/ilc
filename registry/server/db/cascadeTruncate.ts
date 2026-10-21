import type Knex from 'knex';

export function cascadeTruncatePlugin(knex: typeof Knex): void {
    knex.QueryBuilder.extend('cascadeTruncate', function cascadeTruncate() {
        const table: string = this.client.queryCompiler(this).tableName;
        return this.client.raw(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    });
}
