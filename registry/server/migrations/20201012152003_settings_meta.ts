import * as Knex from "knex";
import {
    Scope,
} from "../settings/interfaces";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.table('settings', table => {
        table.string('default', 50).notNullable().defaultTo(JSON.stringify(''));
        table.enum('scope', [Scope.Ilc, Scope.Registry]).notNullable().defaultTo('registry');
        table.boolean('secret').notNullable().defaultTo(false);
        table.json('meta').notNullable().defaultTo(JSON.stringify({}));
    });
};


export async function down(knex: Knex): Promise<void> {
    return knex.schema.table('settings', table => {
        table.dropColumn('default');
        table.dropColumn('scope');
        table.dropColumn('secret');
        table.dropColumn('meta');
    });
};

