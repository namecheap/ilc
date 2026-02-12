import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable('router_domains', (table) => {
        table
            .string('brandId', 64)
            .nullable()
            .comment('Brand identifier for multi-brand support. Propagated to apps and include requests.');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('router_domains', (table) => {
        table.dropColumn('brandId');
    });
}
