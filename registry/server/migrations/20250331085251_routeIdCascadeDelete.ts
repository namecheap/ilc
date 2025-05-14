import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('route_slots', (table) => {
        table.dropForeign('routeId');
        table.foreign('routeId').references('routes.id').onDelete('CASCADE');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('route_slots', (table) => {
        table.dropForeign('routeId');
        table.foreign('routeId').references('routes.id');
    });
}
