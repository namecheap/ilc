import { Knex } from 'knex';
import { isSqlite } from '../util/db';

export async function up(knex: Knex): Promise<void> {
    if (!isSqlite(knex)) {
        return knex.schema.alterTable('routes', (table) => {
            table.json('meta').alter({});
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    if (!isSqlite(knex)) {
        return knex.schema.alterTable('routes', (table) => {
            table.text('meta').alter({});
        });
    }
}
