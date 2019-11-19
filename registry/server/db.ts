'use strict';

import knex from 'knex';
import config from 'config';
import _ from 'lodash/fp';

/**
 * Original source code was taken from {@link https://github.com/prototypejs/prototype/blob/5fddd3e/src/prototype/lang/string.js#L702}
 */
const isJSON = (str: string): boolean => {
    if (/^\s*$/.test(str)) return false;

    str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
    str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
    str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');

    return (/^[\],:{}\s]*$/).test(str);
};

const parseJSON = (value: any): any => {
    if (_.isString(value) && isJSON(value)) {
        return JSON.parse(value);
    }

    return value;
}

const omitEmptyValues = _.omitBy(_.cond([
    [_.isNull, _.stubTrue],
    [_.isEmpty, _.stubTrue],
    [_.stubTrue, _.stubFalse]
]));

const omitPostResponseEmptyValues = _.cond([
    [_.isArray, _.map(omitEmptyValues)],
    [_.isObject, omitEmptyValues],
    [_.stubTrue, (value: any) => value]
]);

const parsePostResponseJSON = _.cond([
    [_.isArray, _.map(_.mapValues(parseJSON))],
    [_.isObject, _.mapValues(parseJSON)],
    [_.stubTrue, parseJSON]
]);

const postProcessResponse = _.compose(
    omitPostResponseEmptyValues,
    parsePostResponseJSON,
);

const client: string = config.get('database.client');

const knexConf: knex.Config = { // after: const knex = require('knex')({client: 'mysql'});
    client: client,
    connection: config.get('database.connection'),
    postProcessResponse,
};

if (client === 'mysql') {
    knexConf.pool = {
        afterCreate: (conn: any, done: Function) => {
            conn.query('SET time_zone="+00:00";', (err: Error) => done(err, conn))
        }
    };
}

export default knex(knexConf);
