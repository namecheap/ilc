import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
    return knex.schema.table('apps', function (table) {
        table.dropColumn('initProps');
    })
}


export async function down(knex: Knex): Promise<any> {
    return knex.schema.createTable('apps', table => {
        table.json('initProps');
    });
}

