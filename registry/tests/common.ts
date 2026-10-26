import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type { Knex } from 'knex';
import supertest, { type Agent } from 'supertest';
import app from '../server/app';
import { createServices } from '../server/composition';
import { dbFactory as dbFactoryOrig, knexConfig } from '../server/db';

/**
 * Deletes a record in a test cleanup. Fails when the record is neither deleted nor already absent,
 * so a failed cleanup fails the test that left the record instead of the following tests.
 */
export async function ensureDeleted(req: Agent, url: string): Promise<void> {
    const { status, text } = await req.delete(url);
    const isDeleted = status >= 200 && status < 300;
    const isAbsent = status === 404;

    if (!isDeleted && !isAbsent) {
        throw new Error(`Cleanup DELETE ${url} failed with ${status}: ${text}`);
    }
}

/** The connection the app under test uses, for tests that read or write the database directly */
export const db = dbFactoryOrig(knexConfig);
const appDb = db;

export const request = async () => supertest(await app(appDb, false));

/** Built the way the app builds it, for tests that read or change settings directly */
export const settingsService = createServices(appDb).settings;
export const requestWithAuth = async () => supertest(await app(appDb, true));

/**
 * Creates an empty database next to the app one, for tests that run migrations and seeds on their own.
 */
export async function dbFactory() {
    const connection = knexConfig.connection as Knex.PgConnectionConfig;
    const database = `${connection.database}_isolated`;
    await appDb.raw('DROP DATABASE IF EXISTS ?? WITH (FORCE)', [database]);
    await appDb.raw('CREATE DATABASE ??', [database]);

    // Knex makes "password" non-enumerable on the connection it got, so the spread does not copy it
    const db = dbFactoryOrig({
        ...knexConfig,
        connection: { ...connection, password: connection.password, database },
    });

    return {
        db,
        reset: async () => {
            await db.destroy();
            await appDb.raw('DROP DATABASE ?? WITH (FORCE)', [database]);
        },
    };
}

chai.use(chaiAsPromised);
export { expect } from 'chai';
