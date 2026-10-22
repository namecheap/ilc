import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.raw('CREATE INDEX versioning_entity_idx ON "versioning" (entity_type,entity_id,id DESC);');
}

export async function down(knex: Knex): Promise<void> {
    return knex.raw('DROP INDEX versioning_entity_idx;');
}
