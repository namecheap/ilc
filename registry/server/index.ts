import path from 'path';
import app from './app';
import server from './server';
import { getLogger } from './util/logger';

process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../config');
require('newrelic'); //Should be lower than NODE_CONFIG_DIR env var definition

(async () => {
    try {
        server(await app());
    } catch (e: any) {
        getLogger().error(e);
        process.exit(-1);
    }
})();
