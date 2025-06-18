import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.table('router_domains', (table) => {
        table.json('props');
        table.json('ssrProps');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.table('router_domains', (table) => {
        table.dropColumn('props');
        table.dropColumn('ssrProps');
    });
}
