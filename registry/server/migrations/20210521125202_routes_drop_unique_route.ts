import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable('routes', (table) => {
        table.dropUnique(['route', 'domainIdIdxble'], 'routes_route_and_domainIdIdxble_unique');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('routes', (table) => {
        table.unique(['route', 'domainIdIdxble'], 'routes_route_and_domainIdIdxble_unique');
    });
}
