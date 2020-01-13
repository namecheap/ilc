import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
    return knex.schema.createTable('route_slots', table => {
        table.increments('id');
        table.integer('routeId').notNullable().references('routes.id');
        table.string('name', 255).notNullable();
        table.string('appName', 50).notNullable().references('apps.name');
        table.json('props').defaultTo('{}');
    });
}


export async function down(knex: Knex): Promise<any> {
}

