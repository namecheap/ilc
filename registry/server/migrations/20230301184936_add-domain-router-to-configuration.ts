import { Knex } from 'knex';
import { Scope, SettingTypes } from '../settings/interfaces';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.table('settings', (table) => {
        table.integer('router_domain_id').defaultTo(null).unsigned().references('id').inTable('router_domains');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.table('settings', (table) => {
        table.dropColumn('router_domain_id');
    });
}
