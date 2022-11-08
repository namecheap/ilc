import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.table('apps', (table) => {
        table.renameColumn('l20nManifest', 'l10nManifest');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.table('apps', (table) => {
        table.renameColumn('l10nManifest', 'l20nManifest');
    });
}
