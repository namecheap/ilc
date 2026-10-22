import { Knex } from 'knex';

// Dropped the temporary tables that only the SQLite versions of earlier migrations created.
// Kept as a no-op because databases have it recorded as applied.
export async function up(knex: Knex): Promise<void> {}

export async function down(knex: Knex): Promise<void> {}
