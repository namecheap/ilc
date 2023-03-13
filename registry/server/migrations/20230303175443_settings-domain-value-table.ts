import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('settings_domain_value', (table) => {
        table.increments('id').primary();
        table.integer('domainId').references('id').inTable('router_domains').notNullable();
        table.string('key').notNullable();
        table.foreign('key').references('key').inTable('settings');
        table.unique(['domainId', 'key']);
        table.text('value').notNullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('settings_domain_value');
}
