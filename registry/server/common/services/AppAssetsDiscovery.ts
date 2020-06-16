import axios, {AxiosResponse} from 'axios';
import _ from 'lodash';
import urljoin from 'url-join';

import knex from '../../db';
import manifestProcessor from './assetsManifestProcessor';

export default class AppAssetsDiscovery {
    private timerId?: NodeJS.Timeout;

    private intervalSeconds: number;

    constructor(intervalSeconds = 5) {
        this.intervalSeconds = intervalSeconds;
    }

    start(delay: number = 1000) {
        this.timerId = setInterval(() => this.iteration().catch(err => {
            console.error('Error during refresh of the assets info:', err);
        }), delay);
    }

    stop() {
        clearInterval(this.timerId!);
    }

    private async iteration() {
        const now = Math.floor(Date.now() / 1000);
        const updateAfter = now - this.intervalSeconds;

        const apps = await knex.select().from('apps')
            .whereNotNull('assetsDiscoveryUrl')
            .andWhere(function () {
                this.whereNull('assetsDiscoveryUpdatedAt')
                    .orWhere('assetsDiscoveryUpdatedAt', '<', updateAfter);
            });

        for (const app of apps) {
            let reqUrl = app.assetsDiscoveryUrl;

            // This implementation of communication between ILC & apps duplicates code in ILC ServerRouter
            // and so should be refactored in the future.
            if (app.props && app.props !== '{}') {
                const appProps = Buffer.from(app.props).toString('base64');
                reqUrl = urljoin(reqUrl, `?appProps=${appProps}`);
            }

            let res: AxiosResponse;
            try {
                res = await axios.get(reqUrl, {responseType: 'json'});
            } catch (err) {
                //TODO: add exponential back-off
                console.warn(`Can't refresh assets for app "${app.name}". Error: ${err.toString()}`);
                continue;
            }

            let data = manifestProcessor(reqUrl, res.data);

            await knex('apps').where('name', app.name).update(Object.assign({}, data, {
                assetsDiscoveryUpdatedAt: now,
            }));
        }
    }
}
