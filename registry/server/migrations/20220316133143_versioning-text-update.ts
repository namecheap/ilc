import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable('versioning', table => {
        table.text('data', 'mediumtext').alter({});
        table.text('data_after', 'mediumtext').alter({});
    });
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('versioning', table => {
        table.text('data').alter({});
        table.text('data_after').alter({});
    });
}

