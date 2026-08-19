import path from 'node:path';
process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../config');

import config from 'config';
import { Knex, knex } from 'knex';

import { cascadeTruncatePlugin } from '../server/db/cascadeTruncate';
import { knexLoggerAdapter } from '../server/db/logger';
import { PrecompiledMigrationSource } from '../server/db/migrationSource';
import { syncSequencePlugin } from '../server/db/syncSequence';
import { logConnectionString } from '../server/util/db';
import { loadPlugins } from '../server/util/pluginManager';

loadPlugins();
cascadeTruncatePlugin(knex);
syncSequencePlugin(knex);
logConnectionString();

const knexConfig: Knex.Config = config.get('database');

const connection = typeof knexConfig.connection === 'object' ? { ...knexConfig.connection } : knexConfig.connection;

let migrations = knexConfig.migrations;
if (typeof migrations?.directory === 'string') {
    // Knex resets a custom migrationSource whenever FS-related options (directory, loadExtensions)
    // are present, so the compiled config must pass the migration source only
    const { directory, loadExtensions, sortDirsSeparately, ...restMigrations } = migrations;
    migrations = {
        ...restMigrations,
        migrationSource: new PrecompiledMigrationSource(directory),
    };
}

export default {
    ...knexConfig,
    connection,
    migrations,
    log: knexLoggerAdapter(),
};
