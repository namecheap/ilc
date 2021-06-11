import * as Knex from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.table('apps', table => {
        table.json('discoveryMetadata');
    });
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.table('apps', table => {
        table.dropColumn('discoveryMetadata');
    });
}
