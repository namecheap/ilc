import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('routes', (table) => {
        table.string('namespace', 50).nullable();
    });
    // TODO remove condition WHERE namespace IS NOT NULL when everything migrated
    await knex.raw('CREATE UNIQUE INDEX route_unique ON routes(route, namespace) WHERE namespace IS NOT NULL');
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('routes', (table) => {
        table.dropIndex(['route', 'namespace'], 'route_unique');
        table.dropColumn('namespace');
    });
}
