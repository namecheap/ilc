import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<any> {
    return knex.transaction(async function (trx) {
        isMySQL(knex) && (await knex.schema.raw('SET FOREIGN_KEY_CHECKS = 0;').transacting(trx));

        try {
            await knex('route_slots').transacting(trx).truncate();
            await knex('routes').transacting(trx).truncate();
            await knex('apps').transacting(trx).truncate();
            await knex('shared_props').transacting(trx).truncate();
            await knex('router_domains').transacting(trx).truncate();
            await knex('templates').transacting(trx).truncate();
        } finally {
            isMySQL(knex) && (await knex.schema.raw('SET FOREIGN_KEY_CHECKS = 1;').transacting(trx));
        }
    });
}

function isMySQL(knex: Knex) {
    return ['mysql', 'mariasql', 'mariadb'].indexOf(knex.client.dialect) > -1;
}
