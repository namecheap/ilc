import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable('templates', (table) => {
        table.text('content', 'mediumtext').alter({});
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('templates', (table) => {
        table.text('content').alter({});
    });
}
