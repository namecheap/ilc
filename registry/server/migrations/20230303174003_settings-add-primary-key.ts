import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.table('settings', (table) => {
        table.primary(['key'], { constraintName: 'settings_primary_key' });
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.table('settings', (table) => {
        table.dropPrimary();
    });
}
