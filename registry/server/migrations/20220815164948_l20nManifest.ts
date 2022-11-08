import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.table('apps', (table) => {
        table.string('l20nManifest', 255).nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.table('apps', (table) => {
        table.dropColumn('l20nManifest');
    });
}
