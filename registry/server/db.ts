'use strict';

import knex from 'knex';
import config from 'config';

const client: string = config.get('database.client');

const knexConf: knex.Config = { // after: const knex = require('knex')({client: 'mysql'});
    client: client,
    connection: config.get('database.connection'),

};

if (client === 'mysql') {
    knexConf.pool = {
        afterCreate: (conn: any, done: Function) => {
            conn.query('SET time_zone="+00:00";', (err: Error) => done(err, conn))
        }
    };
}

export default knex(knexConf);
