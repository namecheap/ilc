import { Knex } from "knex";


export async function up(knex: Knex): Promise<any> {
    return knex.schema.createTable('templates', table => {
        table.string('name', 50).notNullable().unique();
        table.text('content').notNullable();
    });
}


export async function down(knex: Knex): Promise<any> {
}

