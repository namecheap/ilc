import type Knex from 'knex';
import { isPostgres } from '../util/db';

export function cascadeTruncatePlugin(knex: typeof Knex): void {
    knex.QueryBuilder.extend('cascadeTruncate', function cascadeTruncate() {
        if (isPostgres(this)) {
            const table: string = this.client.queryCompiler(this).tableName;
            return this.client.raw(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        } else {
            return this.truncate();
        }
    });
}
