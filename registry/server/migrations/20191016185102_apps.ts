import { Knex } from "knex";


export async function up(knex: Knex): Promise<any> {
    return knex.schema.createTable('apps', table => {
        table.string('name', 50).notNullable().primary();
        table.string('spaBundle', 255).notNullable();
        table.string('cssBundle', 255).nullable();
        table.json('dependencies');
        table.json('ssr').nullable();
        table.json('initProps');
        table.json('props');
        table.string('assetsDiscoveryUrl', 255).nullable();
        table.integer('assetsDiscoveryUpdatedAt').nullable();
    });
}


export async function down(knex: Knex): Promise<any> {
}

