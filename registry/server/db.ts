'use strict';

import knex from 'knex';
import config from 'config';

const client: string = config.get('database.client');

const knexConf: knex.Config = { // after: const knex = require('knex')({client: 'mysql'});
    client: client,
    connection: config.get('database.connection'),
    /**
     * Sqlite does not support inserting default values
     * That is why we added it
     */
    useNullAsDefault: true,
};

if (client === 'mysql') {
    knexConf.pool = {
        afterCreate: (conn: any, done: Function) => {
            conn.query('SET time_zone="+00:00";', (err: Error) => done(err, conn))
        }
    };
} else if (client === 'sqlite3'){
    knexConf.pool = {
        afterCreate: (conn: any, done: Function) => {
            conn.run('PRAGMA foreign_keys = ON;', (err: Error) => done(err, conn))
        }
    };
}

knex.QueryBuilder.extend('range', function (this: any, range: string|null|undefined): knex.QueryBuilder<any, any> {
    if (typeof range !== 'string') {
        return this.client.transaction(async (trx: any) => {
            const res = await this.transacting(trx);
            return {data: res, pagination: {total: res.length}}
        });
    }

    const input = JSON.parse(range);

    const countQuery = new this.constructor(this.client)
        .count('* as total')
        .from(
            this.clone()
                .offset(0)
                .as('__count__query__'),
        )
        .first();

    // This will paginate the data itself
    this.offset(parseInt(input[0])).limit(parseInt(input[1]) - parseInt(input[0]) + 1);

    return this.client.transaction(async (trx: any) => {
        const res = await this.transacting(trx);
        const { total } = await countQuery.transacting(trx);
        return {data: res, pagination: { total }}
    });
});

export default knex(knexConf);
