import * as Knex from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.table('apps', table => {
        table.json('ssrProps');
    });
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.table('apps', table => {
        table.dropColumn('ssrProps');
    });
}

