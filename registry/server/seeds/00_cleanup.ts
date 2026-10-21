import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<any> {
    const tables = ['route_slots', 'routes', 'apps', 'shared_props', 'shared_libs', 'router_domains', 'templates'];
    return knex.transaction(async function (trx) {
        for (const table of tables) {
            await knex(table).transacting(trx).cascadeTruncate();
        }
    });
}
