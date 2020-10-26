import * as Knex from "knex";
import {
    Scope,
} from "../settings/interfaces";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.table('settings', table => {
        table.text('default');
        table.enum('scope', [Scope.Ilc, Scope.Registry]).notNullable().defaultTo('registry');
        table.boolean('secret').notNullable().defaultTo(false);
        table.json('meta');
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

