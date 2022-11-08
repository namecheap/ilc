import { Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
    return knex.schema.table('route_slots', (table) => {
        table.enu('kind', ['primary', 'essential', 'regular']);
    });
}

export async function down(knex: Knex): Promise<any> {
    return knex.schema.table('route_slots', (table) => {
        table.dropColumn('kind');
    });
}
