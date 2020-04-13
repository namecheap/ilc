import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
    return knex.schema.createTable('auth_entities', table => {
        table.increments('id').primary();
        table.string('identifier', 255).notNullable();
        table.string('secret', 255);
        table.string('provider', 20);
        table.string('role', 20);
        table.json('meta');

        table.unique(['provider', 'identifier']);
    });
}


export async function down(knex: Knex): Promise<any> {
}

