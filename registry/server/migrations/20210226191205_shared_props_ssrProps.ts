import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.table('shared_props', table => {
        table.json('ssrProps');
    });
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.table('shared_props', table => {
        table.dropColumn('ssrProps');
    });
}

