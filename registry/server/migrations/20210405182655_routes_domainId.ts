import { Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
    return knex.schema.table('routes', (table) => {
        table.integer('domainId', 10).unsigned().nullable().references('router_domains.id');

        table.dropUnique(['specialRole'], 'routes_specialrole_unique');
        table.unique(['specialRole', 'domainId'], 'routes_specialrole_and_domainId_unique');
    });
}

export async function down(knex: Knex): Promise<any> {
    return knex.schema.table('routes', (table) => {
        table.dropUnique(['specialRole', 'domainId'], 'routes_specialrole_and_domainId_unique');
        table.unique(['specialRole'], 'routes_specialrole_unique');

        table.dropColumn('domainId');
    });
}
