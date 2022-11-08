import { Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
    return knex.schema.createTable('sessions', function (table) {
        table.string('sid').primary();
        table.json('sess').notNullable();

        if (isMySQL(knex)) {
            table.dateTime('expired').notNullable().index();
        } else {
            table.timestamp('expired').notNullable().index();
        }
    });
}

export async function down(knex: Knex): Promise<any> {}

function isMySQL(knex: Knex) {
    return ['mysql', 'mariasql', 'mariadb'].indexOf(knex.client.dialect) > -1;
}
