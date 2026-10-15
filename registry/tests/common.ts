import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import http from 'http';
import supertest, { type Agent } from 'supertest';
import app from '../server/app';
import appDb, { dbFactory as dbFactoryOrig } from '../server/db';
import versioningService from '../server/versioning/services/Versioning';

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

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

export const request = async () => supertest(await app(false));
export const requestWithAuth = async () => supertest(await app(true));

export function dbFactory() {
    const db = dbFactoryOrig({
        client: 'sqlite3',
        connection: ':memory:',
        useNullAsDefault: true,
        pool: {
            afterCreate: (conn: any, done: Function) => {
                conn.run('PRAGMA foreign_keys = ON;', (err: Error) => done(err, conn));
            },
        },
    });

    return {
        db,
        reset: async () => {
            await db.destroy();
            // dbFactory pointed the versioning singleton to the in-memory DB, point it back to the app DB.
            // A new Knex instance would open a second connection to the same SQLite file, and concurrent
            // writes over the two connections fail with SQLITE_BUSY.
            versioningService.setDb(appDb);
        },
    };
}

export function getServerAddress(server: http.Server): string {
    const addressInfo = server.address();

    if (!addressInfo) {
        return '';
    }

    if (isString(addressInfo)) {
        return addressInfo;
    }

    const { address, port } = addressInfo;
    return `${address == '::' ? '127.0.0.1' : address}:${port}`;
}

chai.use(chaiAsPromised);
export { expect } from 'chai';
