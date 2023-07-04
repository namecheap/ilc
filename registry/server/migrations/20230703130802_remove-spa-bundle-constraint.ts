import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable('apps', (table) => {
        table.string('spaBundle', 255).nullable().alter();
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('apps', (table) => {
        table.string('spaBundle', 255).notNullable().alter();
    });
}
