import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import http from 'http';
import supertest from 'supertest';
import app from '../server/app';
import { dbFactory as dbFactoryOrig, knexConfig } from '../server/db';

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

export const request = async () => supertest(await app(false));
export const requestWithAuth = async () => supertest(await app(true));

let dbInstanceNum = 0;
export function dbFactory() {
    const db = dbFactoryOrig({
        client: 'sqlite3',
        connection: {
            filename: `file:memdb${dbInstanceNum}?mode=memory`,
            flags: ['OPEN_URI'],
        },
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
            dbFactoryOrig(knexConfig); // reset Knex instances singletone, otherwise test continue to use old instace
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
