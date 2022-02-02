import supertest from 'supertest';
import app from '../server/app';
import {dbFactory as dbFactoryOrig} from '../server/db';

export const request = supertest(app(false));
export const requestWithAuth = supertest(app(true));

export function dbFactory() {
    return dbFactoryOrig({
        client: 'sqlite3',
        connection: ':memory:',
        useNullAsDefault: true,
        pool: {
            afterCreate: (conn: any, done: Function) => {
                conn.run('PRAGMA foreign_keys = ON;', (err: Error) => done(err, conn))
            }
        }
    });
}

export { expect } from 'chai';
