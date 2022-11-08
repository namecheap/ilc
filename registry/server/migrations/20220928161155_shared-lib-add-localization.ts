import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.table('shared_libs', (table) => {
        table.string('l10nManifest', 255).nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.table('shared_libs', (table) => {
        table.dropColumn('l10nManifest');
    });
}
