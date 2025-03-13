import type { Knex } from 'knex';
import { isMySQL } from '../util/db';

export async function up(knex: Knex): Promise<void> {
    if (!isMySQL(knex)) {
        await knex.schema.alterTable('routes', (table) => {
            table.dropIndex(['route', 'namespace'], 'route_unique');
        });
        // TODO remove condition WHERE namespace IS NOT NULL when everything migrated
        await knex.raw('CREATE UNIQUE INDEX route_unique ON routes("orderPos", namespace) WHERE namespace IS NOT NULL');
    }
}

export async function down(knex: Knex): Promise<void> {
    // MySQL does not support partial index
    if (!isMySQL(knex)) {
        await knex.schema.alterTable('routes', (table) => {
            table.dropIndex(['orderPos', 'namespace'], 'route_unique');
        });
        // TODO remove condition WHERE namespace IS NOT NULL when everything migrated
        await knex.raw('CREATE UNIQUE INDEX route_unique ON routes(route, namespace) WHERE namespace IS NOT NULL');
    }
}
