import { Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
    return knex.schema.table('routes', (table) => {
        table.text('meta');
    });
}

export async function down(knex: Knex): Promise<any> {
    return knex.schema.table('routes', (table) => {
        table.dropColumn('meta');
    });
}
