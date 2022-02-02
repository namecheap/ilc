import { Knex } from "knex";
import isMySQL from "../util/isMySQL";

export async function up(knex: Knex): Promise<any> {
    return knex.schema.table('routes', function (table) {
        table.dropColumn('specialRole');
    });
}


export async function down(knex: Knex): Promise<any> {
    return knex.schema.table('routes', function (table) {
        table.enum('specialRole', ['404']).nullable();
    });
}
