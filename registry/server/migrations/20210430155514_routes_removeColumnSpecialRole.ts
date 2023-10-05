import { Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
    return knex.schema.table('routes', function (table) {
        table.dropColumn('specialRole');
    });
}

export async function down(knex: Knex): Promise<any> {
    return knex.schema.table('routes', function (table) {
        table.enum('specialRole', ['404']).nullable();
    });
}
