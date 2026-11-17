import { Knex } from 'knex';

/**
 * One-time OAuth authorization codes issued by GET /oauth/authorize and exchanged at POST /oauth/token.
 * The code itself is never stored, only its SHA-256; rows live for about a minute.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('oauth_authorization_codes', (table) => {
        table.string('codeHash', 64).primary();
        table.string('clientId', 255).notNullable();
        table.string('redirectUri', 2048).notNullable();
        table.string('codeChallenge', 128).notNullable();
        // Space separated, as in the OAuth `scope` parameter
        table.string('scopes', 255).notNullable();
        table.json('user').notNullable();
        table.timestamp('expiresAt').notNullable().index();
        table.boolean('used').notNullable().defaultTo(false);
        table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('oauth_authorization_codes');
}
