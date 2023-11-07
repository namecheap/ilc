require('ts-node/register');

import path from 'node:path';
process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../config');

import config from 'config';
import { Knex, knex } from 'knex';

import { cascadeTruncatePlugin } from '../server/db/cascadeTruncate';
import { knexLoggerAdapter } from '../server/db/logger';
import { syncSequencePlugin } from '../server/db/syncSequence';
import { logConnectionString } from '../server/util/db';
import { loadPlugins } from '../server/util/pluginManager';

loadPlugins();
cascadeTruncatePlugin(knex);
syncSequencePlugin(knex);
logConnectionString();

const knexConfig: Knex.Config = config.get('database');

const connection = typeof knexConfig.connection === 'object' ? { ...knexConfig.connection } : knexConfig.connection;

export default {
    ...knexConfig,
    connection,
    log: knexLoggerAdapter(),
};
