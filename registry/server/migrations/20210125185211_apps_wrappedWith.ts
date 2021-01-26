import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
    return knex.schema.table('apps', table => {
        table.string('wrappedWith', 50).nullable().references('apps.name');
    });
}


export async function down(knex: Knex): Promise<any> {
    return knex.schema.table('apps', table => {
        table.dropColumn('wrappedWith');
    });
}

