import { Knex } from 'knex';
import { Tables } from '../db/structure';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable(Tables.TemplatesLocalized, (table) => {
        table.string('templateName', 50).notNullable().references('templates.name').onDelete('CASCADE');
        table.text('content', 'mediumtext').notNullable();
        table.string('locale', 7).notNullable();
        table.unique(['templateName', 'locale']);
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTableIfExists(Tables.TemplatesLocalized);
}
