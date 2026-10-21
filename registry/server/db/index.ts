'use strict';

import { Knex, knex } from 'knex';
import config from 'config';
import rangeExtender from './range';
import addVersioning from './versioning';
import { knexLoggerAdapter } from './logger';
import { syncSequencePlugin } from './syncSequence';
import { cascadeTruncatePlugin } from './cascadeTruncate';

const searchPath: string = config.get('database.searchPath');
const connectionConfig: Knex.Config['connection'] = config.get('database.connection');

export const knexConfig: Knex.Config = {
    client: 'pg',
    connection: typeof connectionConfig === 'object' ? { ...connectionConfig } : connectionConfig,
    searchPath,
    log: knexLoggerAdapter(),
};

rangeExtender(knex);
syncSequencePlugin(knex);
cascadeTruncatePlugin(knex);

export { VersionedKnex } from './versioning';

export function dbFactory(conf: Knex.Config) {
    const knexInstance = knex(conf);
    return addVersioning(knexInstance);
}

export default dbFactory(knexConfig);
