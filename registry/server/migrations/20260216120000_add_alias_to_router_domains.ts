import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable('router_domains', (table) => {
        table.string('alias', 64).nullable().unique().comment('Optional short code name alias for the router domain.');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('router_domains', (table) => {
        table.dropColumn('alias');
    });
}
