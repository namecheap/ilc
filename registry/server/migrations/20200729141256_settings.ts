import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
    return knex.schema.createTable('settings', table => {
        table.string('key', 50).notNullable().unique();
        table.text('value');
    });
}


export async function down(knex: Knex): Promise<any> {
}

