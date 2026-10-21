import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('apps', (table) => {
        table.string('namespace', 50).nullable();
    });
    // TODO remove condition WHERE namespace IS NOT NULL when everything migrated
    await knex.raw('CREATE UNIQUE INDEX name_unique ON apps(name, namespace) WHERE namespace IS NOT NULL');
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('apps', (table) => {
        table.dropIndex(['name', 'namespace'], 'name_unique');
        table.dropColumn('namespace');
    });
}
