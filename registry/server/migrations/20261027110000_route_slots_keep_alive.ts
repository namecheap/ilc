import { Knex } from 'knex';

/**
 * Keep-alive slot entries: an app with keepAlive stays mounted (hidden) when a route no longer
 * lists it in the slot. Existing rows keep false and behave as before.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('route_slots', (table) => {
        table.boolean('keepAlive').notNullable().defaultTo(false);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('route_slots', (table) => {
        table.dropColumn('keepAlive');
    });
}
