import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('routes', (table) => {
        table.integer('orderPos', 10).alter().nullable();
    });
    await knex.raw('DROP SEQUENCE routes_orderpos_seq');
}

export async function down(knex: Knex): Promise<void> {
    const { max } = await knex('routes').max<{ max: number } | undefined>('orderPos').first();
    await knex.raw(`CREATE SEQUENCE routes_orderpos_seq START WITH ${max ?? 10} INCREMENT BY 10`);
    await knex.schema.alterTable('routes', (table) => {
        table.integer('orderPos', 10).defaultTo(knex.raw("nextval('routes_orderpos_seq')")).alter();
    });
    await knex.raw('ALTER SEQUENCE routes_orderpos_seq OWNED BY routes."orderPos"');
}
