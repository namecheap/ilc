import { Knex } from 'knex';

/**
 * Several apps per route slot: `position` orders the apps of one slot of one route.
 * Existing rows (one app per slot) keep position 0 and behave as before.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('route_slots', (table) => {
        table.integer('position').notNullable().defaultTo(0);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('route_slots', (table) => {
        table.dropColumn('position');
    });
}
