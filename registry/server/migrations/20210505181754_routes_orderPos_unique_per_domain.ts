import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable('routes', table => {
        table.dropUnique(['orderPos'], 'routes_orderpos_unique');
        table.unique(['orderPos', 'domainIdIdxble'], 'routes_orderpos_and_domainIdIdxble_unique');
    });
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('routes', table => {
        table.dropUnique(['orderPos', 'domainIdIdxble'], 'routes_orderpos_and_domainIdIdxble_unique');
        table.unique(['orderPos'], 'routes_orderpos_unique');
    });
}

