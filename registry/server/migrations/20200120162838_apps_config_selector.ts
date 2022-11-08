import { Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
    return knex.schema.table('apps', (table) => {
        table.string('configSelector', 255);
    });
}

export async function down(knex: Knex): Promise<any> {
    return knex.schema.table('apps', (table) => {
        table.dropColumn('configSelector');
    });
}
