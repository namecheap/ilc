import { Knex } from 'knex';
import { isMySQL } from '../util/db';

export async function seed(knex: Knex): Promise<any> {
    const tables = ['route_slots', 'routes', 'apps', 'shared_props', 'shared_libs', 'router_domains', 'templates'];
    return knex.transaction(async function (trx) {
        if (isMySQL(knex)) {
            await knex.schema.raw('SET FOREIGN_KEY_CHECKS = 0;').transacting(trx);
        }
        try {
            for (const table of tables) {
                await knex(table).transacting(trx).cascadeTruncate();
            }
        } finally {
            if (isMySQL(knex)) {
                await knex.schema.raw('SET FOREIGN_KEY_CHECKS = 1;').transacting(trx);
            }
        }
    });
}
