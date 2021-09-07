import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
    return knex.schema.createTable('shared_libs', table => {
        table.string('name', 50).notNullable().unique();
        table.string('spaBundle', 255).notNullable();
        table.string('assetsDiscoveryUrl', 255).nullable();
        table.integer('assetsDiscoveryUpdatedAt').nullable();
        table.text('adminNotes').nullable();
    });
}


export async function down(knex: Knex): Promise<any> {
    return knex.schema.dropTable('shared_libs');
}
