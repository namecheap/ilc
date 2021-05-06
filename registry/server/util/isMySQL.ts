import * as Knex from "knex";

export default function isMySQL(knex: Knex) {
    return ["mysql", "mariasql", "mariadb"].indexOf(knex.client.dialect) > -1;
}
