import { Knex } from 'knex';
import { isPostgres } from '../util/db';

export async function up(knex: Knex): Promise<void> {
    if (isPostgres(knex)) {
        return knex.raw('CREATE INDEX versioning_entity_idx ON public."versioning" (entity_type,entity_id,id DESC);');
    }
}

export async function down(knex: Knex): Promise<void> {
    if (isPostgres(knex)) {
        return knex.raw('DROP INDEX versioning_entity_idx;');
    }
}
