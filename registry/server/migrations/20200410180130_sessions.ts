import { Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
    return knex.schema.createTable('sessions', function (table) {
        table.string('sid').primary();
        table.json('sess').notNullable();
        table.dateTime('expired').notNullable().index();
    });
}

export async function down(knex: Knex): Promise<any> {}
