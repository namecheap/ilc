import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
    return knex.schema.createTable('apps', table => {
        table.string('name', 50).notNullable().primary();
        table.string('spaBundle', 255).notNullable();
        table.string('cssBundle', 255).nullable();
        table.json('dependencies').defaultTo('{}');
        table.json('ssr').nullable();
        table.json('initProps').defaultTo('{}');
        table.json('props').defaultTo('{}');
        table.string('assetsDiscoveryUrl', 255).nullable();
        table.integer('assetsDiscoveryUpdatedAt').nullable();
    });
}


export async function down(knex: Knex): Promise<any> {
}

