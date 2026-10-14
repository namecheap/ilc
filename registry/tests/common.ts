import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import http from 'http';
import supertest from 'supertest';
import app from '../server/app';
import appDb, { dbFactory as dbFactoryOrig } from '../server/db';
import versioningService from '../server/versioning/services/Versioning';

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

/**
 * A DELETE request without an explicit `.expect()` is a cleanup. When it fails, the record stays in the DB
 * and breaks the following tests instead of the one that left it, so it has to delete the record
 * or find it already deleted.
 */
export function failOnFailedCleanup<T extends object>(agent: T): T {
    return new Proxy(agent, {
        get(target, property, receiver) {
            const value = Reflect.get(target, property, receiver);
            if (property !== 'delete' || typeof value !== 'function') {
                return value;
            }

            return (url: string): supertest.Test => {
                const test: supertest.Test = value.call(target, url);
                let isAsserted = false;

                test.expect = new Proxy(test.expect, {
                    apply(expect, thisArg, args) {
                        isAsserted = true;
                        return Reflect.apply(expect, thisArg, args);
                    },
                });
                test.then = new Proxy(test.then, {
                    apply(then, thisArg, args) {
                        if (!isAsserted) {
                            test.expect(({ status, text }) => {
                                if (status !== 404 && (status < 200 || status >= 300)) {
                                    throw new Error(`Cleanup DELETE ${url} failed with ${status}: ${text}`);
                                }
                            });
                        }
                        return Reflect.apply(then, thisArg, args);
                    },
                });

                return test;
            };
        },
    });
}

export const request = async () => failOnFailedCleanup(supertest(await app(false)));
export const requestWithAuth = async () => failOnFailedCleanup(supertest(await app(true)));

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
