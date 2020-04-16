import * as Knex from "knex";

export async function seed(knex: Knex): Promise<any> {
    return knex.transaction(async function (trx) {
        await knex.schema.raw('SET FOREIGN_KEY_CHECKS = 0;').transacting(trx);

        try {
            await knex('route_slots').transacting(trx).truncate();
            await knex('routes').transacting(trx).truncate();
            await knex('apps').transacting(trx).truncate();
            await knex('templates').transacting(trx).truncate();
        } finally {
            await knex.schema.raw('SET FOREIGN_KEY_CHECKS = 1;').transacting(trx);
        }
    });
}
