import { Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
    return knex.schema.createTable('versioning', (table) => {
        table.increments('id');
        table.string('entity_type').notNullable();
        table.string('entity_id').notNullable();
        table.text('data');
        table.text('data_after');
        table.string('created_by').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<any> {
    return knex.schema.dropTable('versioning');
}
