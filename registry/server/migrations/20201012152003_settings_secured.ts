import * as Knex from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.table('settings', table => {
        table.boolean('secured').notNullable().defaultTo(false);
    });
};


export async function down(knex: Knex): Promise<void> {
    return knex.schema.table('settings', table => {
        table.dropColumn('secured');
    });
};

