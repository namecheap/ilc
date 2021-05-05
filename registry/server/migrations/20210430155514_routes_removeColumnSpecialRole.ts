import * as Knex from "knex";
import isMySQL from "../util/isMySQL";

export async function up(knex: Knex): Promise<any> {
    return knex.schema.table('routes', function (table) {
        table.dropColumn('specialRole');

        if (!isMySQL(knex)) {
            // SQLite drops "unique" during dropping column, so we need to reset it
            table.unique(['orderPos'], 'routes_orderpos_unique');
            table.unique(['route', 'domainId'], 'routes_route_and_domainId_unique');
        }
    });
}


export async function down(knex: Knex): Promise<any> {
    return knex.schema.table('routes', function (table) {
        table.enum('specialRole', ['404']).nullable();
    });
}
