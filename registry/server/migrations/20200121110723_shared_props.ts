import { Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
    return knex.schema.createTable('shared_props', (table) => {
        table.string('name', 255).notNullable();
        table.json('props').notNullable();
    });
}

export async function down(knex: Knex): Promise<any> {
    return knex.schema.dropTable('shared_props');
}
