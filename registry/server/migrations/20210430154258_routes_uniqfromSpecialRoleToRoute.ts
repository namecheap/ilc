import { Knex } from "knex";

export async function up(knex: Knex): Promise<any> {
    return knex.schema.alterTable('routes', table => {
        table.dropUnique(['specialRole', 'domainId'], 'routes_specialrole_and_domainId_unique');
        table.unique(['route', 'domainId'], 'routes_route_and_domainId_unique');
    });
}


export async function down(knex: Knex): Promise<any> {
    return knex.schema.alterTable('routes', table => {
        table.dropUnique(['route', 'domainId'], 'routes_route_and_domainId_unique');
        table.unique(['specialRole', 'domainId'], 'routes_specialrole_and_domainId_unique');
    });
}
