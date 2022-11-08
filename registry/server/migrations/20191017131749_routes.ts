import { Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
    return knex.schema.createTable('routes', (table) => {
        table.increments('id');
        table.enum('specialRole', ['404']).nullable().unique();
        table.integer('orderPos', 10).notNullable().unique();
        table.string('route', 255).notNullable();
        table.boolean('next').notNullable().defaultTo(false);
        table.string('templateName', 50).nullable().references('templates.name');
    });
}

export async function down(knex: Knex): Promise<any> {}
