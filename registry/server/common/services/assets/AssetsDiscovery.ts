import axios, { AxiosResponse } from 'axios';
import urljoin from 'url-join';
import deepEqual from 'deep-equal';

import knex from '../../../db';
import manifestProcessor from './assetsManifestProcessor';
import AssetsDiscoveryWhiteLists from './AssetsDiscoveryWhiteLists';
import { getLogger } from '../../../util/logger';
import { parseJSON } from '../json';
import { axiosErrorTransformer } from '../../../util/axiosErrorTransformer';

export default class AssetsDiscovery {
    private tableName: string;
    private tableId: string;
    private timerId?: NodeJS.Timeout;

    private intervalSeconds: number;

    constructor(tableName: string, { tableId = 'name', intervalSeconds = 5 } = {}) {
        this.tableName = tableName;
        this.tableId = tableId;
        this.intervalSeconds = intervalSeconds;
    }

    start(delay: number = 1000) {
        this.timerId = setInterval(
            () =>
                this.iteration().catch((err) => {
                    getLogger().error(err, 'Error during refresh of the assets info:');
                }),
            delay,
        );
    }

    stop() {
        clearInterval(this.timerId!);
    }

    private isAssetsEqual(manifestAssets: Record<string, any>, dbAssets: Record<string, any>) {
        const shallowCopyDbAssets = Object.assign({}, dbAssets);
        if (shallowCopyDbAssets.dependencies) {
            shallowCopyDbAssets.dependencies = parseJSON(shallowCopyDbAssets.dependencies);
        }
        return deepEqual(shallowCopyDbAssets, manifestAssets);
    }

    private async iteration() {
        const now = Math.floor(Date.now() / 1000);
        const updateAfter = now - this.intervalSeconds;

        const entities = await knex
            .select()
            .from(this.tableName)
            .whereNotNull('assetsDiscoveryUrl')
            .andWhere(function () {
                this.whereNull('assetsDiscoveryUpdatedAt').orWhere('assetsDiscoveryUpdatedAt', '<', updateAfter);
            });

        for (const entity of entities) {
            let reqUrl = entity.assetsDiscoveryUrl;

            // This implementation of communication between ILC & apps duplicates code in ILC ServerRouter
            // and so should be refactored in the future.
            const entityPropsJSON =
                typeof entity.props === 'object' && entity.props !== null ? JSON.stringify(entity.props) : entity.props;
            if (entityPropsJSON && entityPropsJSON !== '{}') {
                const entityPropsBase64 = Buffer.from(entityPropsJSON).toString('base64');
                reqUrl = urljoin(reqUrl, `?appProps=${entityPropsBase64}`);
            }

            let res: AxiosResponse;
            try {
                res = await axios.get(reqUrl, { responseType: 'json' });
            } catch (err: any) {
                //TODO: add exponential back-off
                getLogger().warn(axiosErrorTransformer(err), `Can't refresh assets for "${entity[this.tableId]}"`);
                continue;
            }

            let data = manifestProcessor(reqUrl, res.data, AssetsDiscoveryWhiteLists[this.tableName]);

            const dbAssets = {
                spaBundle: entity.spaBundle,
                cssBundle: entity.cssBundle,
                dependencies: entity.dependencies,
            };

            if (!this.isAssetsEqual(data, dbAssets)) {
                await knex(this.tableName)
                    .where(this.tableId, entity[this.tableId])
                    .update(
                        Object.assign({}, data, {
                            assetsDiscoveryUpdatedAt: now,
                        }),
                    );
                getLogger().info(`Assets for "${entity.name}" were updated`);
            }
        }
    }
}
