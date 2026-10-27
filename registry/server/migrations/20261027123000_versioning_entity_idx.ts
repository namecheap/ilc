import { Knex } from 'knex';
import { isPostgres } from '../util/db';

// 20240315141721_pg_versioning_idx created this index for postgresql only; the versioned read now does one
// index probe per entity row on every dialect, so mysql and sqlite need it as well
export async function up(knex: Knex): Promise<void> {
    if (!isPostgres(knex)) {
        await knex.schema.alterTable('versioning', (table) => {
            table.index(['entity_type', 'entity_id', 'id'], 'versioning_entity_idx');
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    if (!isPostgres(knex)) {
        await knex.schema.alterTable('versioning', (table) => {
            table.dropIndex(['entity_type', 'entity_id', 'id'], 'versioning_entity_idx');
        });
    }
}
