import axios, {AxiosResponse} from 'axios';
import _ from 'lodash';

import knex from '../../db';

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
            let res: AxiosResponse;
            try {
                res = await axios.get(app.assetsDiscoveryUrl, {responseType: 'json'});
            } catch (err) {
                //TODO: add exponential back-off
                console.warn(`Can't refresh assets for app "${app.name}". Error: ${err.toString()}`);
                continue;
            }

            let data = _.pick(res.data, ['spaBundle', 'cssBundle', 'dependencies']);
            if (data.dependencies !== undefined) {
                data.dependencies = JSON.stringify(data.dependencies);
            }

            await knex('apps').where('name', app.name).update(Object.assign({}, data, {
                assetsDiscoveryUpdatedAt: now,
            }));
        }
    }
}
