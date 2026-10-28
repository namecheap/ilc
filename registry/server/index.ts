import './preload';

import app from './app';
import { dbFactory, knexConfig } from './db';
import server from './server';
import { getLogger } from './util/logger';

(async () => {
    try {
        server(await app(dbFactory(knexConfig)));
    } catch (e: any) {
        getLogger().error(e);
        process.exit(-1);
    }
})();
