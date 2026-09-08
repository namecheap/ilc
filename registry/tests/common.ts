import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import http from 'http';
import supertest from 'supertest';
import app from '../server/app';
import defaultDb, { dbFactory as dbFactoryOrig } from '../server/db';
import versioningService from '../server/versioning/services/Versioning';

function isString(value: unknown): value is string {
    return typeof value === 'string';
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
            // `dbFactory()` above re-pointed the versioning singleton (`versioningService.setDb`) at the
            // in-memory instance. Point it back at the app's own instance rather than creating a fresh
            // knex over the same file: a second file-backed instance leaves the app writing through two
            // sqlite handles (versioning transactions on one, everything else on the other), which
            // surfaces as timing-dependent SQLITE_BUSY failures in later specs.
            versioningService.setDb(defaultDb);
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
