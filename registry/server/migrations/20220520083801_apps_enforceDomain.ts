import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.table('apps', (table) => {
        table.integer('enforceDomain', 10).unsigned().nullable().references('router_domains.id');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.table('apps', (table) => {
        table.dropColumn('enforceDomain');
    });
}
