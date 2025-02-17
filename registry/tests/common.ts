import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import http from 'http';
import supertest from 'supertest';
import app from '../server/app';
import { dbFactory as dbFactoryOrig } from '../server/db';

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

export const request = async () => supertest(await app(false));
export const requestWithAuth = async () => supertest(await app(true));

export function dbFactory() {
    return dbFactoryOrig({
        client: 'sqlite3',
        connection: ':memory:',
        useNullAsDefault: true,
        pool: {
            afterCreate: (conn: any, done: Function) => {
                conn.run('PRAGMA foreign_keys = ON;', (err: Error) => done(err, conn));
            },
        },
    });
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
