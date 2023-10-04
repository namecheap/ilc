import { Knex } from 'knex';
import { isSqlite } from '../util/db';

export async function up(knex: Knex): Promise<any> {
    return knex.schema.createTable('sessions', function (table) {
        table.string('sid').primary();
        table.json('sess').notNullable();

        if (!isSqlite(knex)) {
            table.dateTime('expired').notNullable().index();
        } else {
            table.timestamp('expired').notNullable().index();
        }
    });
}

export async function down(knex: Knex): Promise<any> {}
