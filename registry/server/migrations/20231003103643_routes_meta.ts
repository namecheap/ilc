import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable('routes', (table) => {
        table.json('meta').alter({});
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('routes', (table) => {
        table.text('meta').alter({});
    });
}
