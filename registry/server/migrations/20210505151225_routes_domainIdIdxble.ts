import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.raw(
        'ALTER TABLE "routes" ADD "domainIdIdxble" int GENERATED ALWAYS AS (COALESCE("domainId", -1)) STORED;',
    );
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('routes', (table) => {
        table.dropColumn('domainIdIdxble');
    });
}
