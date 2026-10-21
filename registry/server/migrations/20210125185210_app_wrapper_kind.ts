import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.raw(`ALTER TYPE "kind_enum" ADD VALUE 'wrapper';`);
}

export async function down(knex: Knex): Promise<void> {}
