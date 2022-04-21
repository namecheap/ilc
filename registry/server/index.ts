import path from 'path';

process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../config');
require('newrelic'); //Should be lower than NODE_CONFIG_DIR env var definition

import app from './app';
import server from './server';

(async () => {
    try {
        server(await app());
    } catch (e) {
        console.error(e);
        process.exit(-1);
    }
})();
