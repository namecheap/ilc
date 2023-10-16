'use strict';

import { Knex, knex } from 'knex';
import config from 'config';
import rangeExtender from './range';
import addVersioning from './versioning';
import { knexLoggerAdapter } from './logger';
import { syncSequencePlugin } from './syncSequence';
import { cascadeTruncatePlugin } from './cascadeTruncate';

const client: string = config.get('database.client');
const connectionConfig: Knex.StaticConnectionConfig = config.get('database.connection');

export const knexConfig: Knex.Config = {
    client,
    connection: { ...connectionConfig },
    /**
     * Sqlite does not support inserting default values
     * That is why we added it
     */
    useNullAsDefault: true,
    log: knexLoggerAdapter(),
};

if (client === 'mysql') {
    knexConfig.pool = {
        afterCreate: (conn: any, done: Function) => {
            conn.query('SET time_zone="+00:00";', (err: Error) => done(err, conn));
        },
    };
} else if (client === 'sqlite3') {
    knexConfig.pool = {
        afterCreate: (conn: any, done: Function) => {
            conn.run('PRAGMA foreign_keys = ON;', (err: Error) => done(err, conn));
        },
    };
}

rangeExtender(knex);
syncSequencePlugin(knex);
cascadeTruncatePlugin(knex);

export { VersionedKnex } from './versioning';

export function dbFactory(conf: Knex.Config) {
    const knexInstance = knex(conf);
    return addVersioning(knexInstance);
}

export default dbFactory(knexConfig);
