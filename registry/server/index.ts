import 'newrelic';

import app from './app';
import server from './server';
import { getLogger } from './util/logger';

(async () => {
    try {
        server(await app());
    } catch (e: any) {
        getLogger().error(e);
        process.exit(-1);
    }
})();
