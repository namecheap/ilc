require('ts-node/register');
import path from 'node:path';
process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../config');
import config from 'config';
import { Knex, knex } from 'knex';

import { cascadeTruncatePlugin } from '../server/db/cascadeTruncate';
import { syncSequencePlugin } from '../server/db/syncSequence';
import { logConnectionString } from '../server/util/db';
import { loadPlugins } from '../server/util/pluginManager';
import { knexLoggerAdapter } from '../server/db/logger';

loadPlugins();
cascadeTruncatePlugin(knex);
syncSequencePlugin(knex);
logConnectionString();

const knexConfig: Knex.Config = config.get('database');

export default {
    ...knexConfig,
    log: knexLoggerAdapter(),
};
