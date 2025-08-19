import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable('router_domains', (table) => {
        table
            .string('canonical_domain', 255)
            .nullable()
            .comment('Canonical domain for mirror sites. Used in canonical tags for SEO.');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('router_domains', (table) => {
        table.dropColumn('canonical_domain');
    });
}
