import { Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
    return knex.schema.alterTable('routes', (table) => {
        table.integer('orderPos', 10).nullable().alter({}); // alter table don't affect only uniq constraint, so you don't need and it's disallowed to set unique('routes_orderpos_unique') here
    });
}

export async function down(knex: Knex): Promise<any> {
    return knex.schema.alterTable('routes', (table) => {
        table.integer('orderPos', 10).notNullable().alter({});
    });
}
