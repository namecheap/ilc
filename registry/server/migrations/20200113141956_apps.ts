import { Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
    return knex.schema.table('apps', (table) => {
        table.enu('kind', ['primary', 'essential', 'regular']).defaultTo('regular');
    });
}

export async function down(knex: Knex): Promise<any> {
    return knex.schema.table('apps', (table) => {
        table.dropColumn('kind');
    });
}
