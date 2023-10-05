import { Knex } from 'knex';
import { isSqlite } from '../util/db';

export async function up(knex: Knex): Promise<void> {
    if (isSqlite(knex)) {
        await knex.schema.dropTable('old_route_slots');
        await knex.schema.dropTable('old_route_slots_2');
        await knex.schema.dropTable('old_routes');
        await knex.schema.dropTable('old_routes_2');
    }
}

export async function down(knex: Knex): Promise<void> {
    if (isSqlite(knex)) {
        throw new Error('Not implemented');
    }
}
