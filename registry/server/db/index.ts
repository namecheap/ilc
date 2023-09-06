'use strict';

import { Knex, knex } from 'knex';
import config from 'config';
import rangeExtender from './range';
import addVersioning from './versioning';
import { knexLoggerAdapter } from './logger';

const client: string = config.get('database.client');

const knexConf: Knex.Config = {
    // after: const knex = require('knex')({client: 'mysql'});
    client: client,
    connection: config.get('database.connection'),
    /**
     * Sqlite does not support inserting default values
     * That is why we added it
     */
    useNullAsDefault: true,
    log: knexLoggerAdapter(),
};

if (client === 'mysql') {
    knexConf.pool = {
        afterCreate: (conn: any, done: Function) => {
            conn.query('SET time_zone="+00:00";', (err: Error) => done(err, conn));
        },
    };
} else if (client === 'sqlite3') {
    knexConf.pool = {
        afterCreate: (conn: any, done: Function) => {
            conn.run('PRAGMA foreign_keys = ON;', (err: Error) => done(err, conn));
        },
    };
}

rangeExtender(knex);

export { VersionedKnex } from './versioning';

export function dbFactory(conf: Knex.Config) {
    const knexInstance = knex(conf);
    return addVersioning(knexInstance);
}

export default dbFactory(knexConf);
