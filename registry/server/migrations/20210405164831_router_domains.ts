import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
    return knex.schema.createTable('router_domains', table => {
        table.increments('id');
        table.string('domainName', 255).notNullable();
    });
}


export async function down(knex: Knex): Promise<any> {
    return knex.schema.dropTable('router_domains');
}
