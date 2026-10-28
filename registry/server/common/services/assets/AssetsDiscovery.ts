import axios, { AxiosResponse } from 'axios';
import urljoin from 'url-join';
import deepEqual from 'deep-equal';

import type { Knex } from 'knex';
import { ManifestData, processManifest } from './assetsManifestProcessor';
import AssetsDiscoveryWhiteLists from './AssetsDiscoveryWhiteLists';
import { getLogger } from '../../../util/logger';
import { parseJSON } from '../../../util/json';
import { axiosErrorTransformer } from '../../../util/axiosErrorTransformer';
import { exponentialRetry } from '../../../util/axiosExponentialRetry';
import newrelic from 'newrelic';

type AssetsDiscoveryEntity = {
    [key: string]: any;
    assetsDiscoveryUrl: string;
    spaBundle: string;
    cssBundle: string;
    dependencies: string;
    assetsDiscoveryUpdatedAt: number;
    props?: object | null;
};

type DbAssetsOnly = Pick<AssetsDiscoveryEntity, 'spaBundle' | 'cssBundle' | 'dependencies'>;

export default class AssetsDiscovery {
    private tableName: keyof typeof AssetsDiscoveryWhiteLists;

    private tableId: 'name';

    private timerId?: NodeJS.Timeout;

    private stopped = false;

    private intervalSeconds: number;

    // last successful manifest check per entity: the row is only written when the assets changed, so this
    // keeps unchanged entities on the same refresh interval (names of deleted entities linger, harmlessly)
    private checkedAt = new Map<string, number>();

    constructor(
        private readonly db: Knex,
        tableName: keyof typeof AssetsDiscoveryWhiteLists,
        { tableId = 'name' as const, intervalSeconds = 5 } = {},
    ) {
        this.tableName = tableName;
        this.tableId = tableId;
        this.intervalSeconds = intervalSeconds;
    }

    start(delay: number = 1000) {
        this.stopped = false;

        const runLoop = () => {
            this.timerId = setTimeout(async () => {
                await this.iteration().catch((err) => {
                    getLogger().error(err, 'Error during refresh of the assets info:');
                });
                // stop() may be called while the iteration is in progress, when there is no timer to clear yet
                if (!this.stopped) {
                    runLoop();
                }
            }, delay);
        };

        runLoop();
    }

    stop() {
        this.stopped = true;
        clearTimeout(this.timerId);
    }

    private async iteration() {
        return newrelic.startBackgroundTransaction(this.tableName, AssetsDiscovery.constructor.name, async () => {
            const now = Math.floor(Date.now() / 1000);
            const entities = await this.getEntitiesToRefresh(now);

            for (const entity of entities) {
                const id = entity[this.tableId];
                if (this.isRecentlyChecked(id, now)) {
                    continue;
                }
                try {
                    await this.processEntity(entity, now);
                    this.checkedAt.set(id, now);
                } catch (err: any) {
                    getLogger().error(axiosErrorTransformer(err), `Can't process assets for "${entity[this.tableId]}"`);
                }
            }
        });
    }

    private async processEntity(entity: AssetsDiscoveryEntity, now: number) {
        const maxRequestTimeout = 10000;
        const startOfRequest = performance.now();

        let reqUrl = this.buildAssetsUrl(entity);
        const res: Readonly<AxiosResponse> = await exponentialRetry(() =>
            axios.get(reqUrl, {
                responseType: 'json',
                timeout: maxRequestTimeout,
            }),
        );
        const data = processManifest(reqUrl, res.data, AssetsDiscoveryWhiteLists[this.tableName]);
        const dbAssets = {
            spaBundle: entity.spaBundle,
            cssBundle: entity.cssBundle,
            dependencies: entity.dependencies,
        };

        if (this.isAssetsEqual(data, dbAssets)) {
            return;
        }

        await this.updateEntityWithNewAssets(entity, data, now);
        getLogger().info(`Assets for "${entity.name}" were updated in ${performance.now() - startOfRequest}ms`);
    }

    private isRecentlyChecked(id: string, now: number) {
        const checkedAt = this.checkedAt.get(id);
        return checkedAt !== undefined && checkedAt >= now - this.intervalSeconds;
    }

    private isAssetsEqual(manifestAssets: ManifestData, dbAssets: DbAssetsOnly) {
        // only the keys the manifest publishes are compared (an explicit null among them clears the column): the
        // update never clears a column the manifest stopped publishing, so comparing it too would rewrite the row
        const published = Object.keys(manifestAssets) as (keyof DbAssetsOnly)[];
        return deepEqual(this.normalizeAssets(dbAssets, published), this.normalizeAssets(manifestAssets, published));
    }

    // the manifest carries "dependencies" as a JSON string while the row carries it as parsed JSON;
    // a column the row does not have (undefined) is the same as a cleared one (null)
    private normalizeAssets(assets: Partial<DbAssetsOnly>, keys: (keyof DbAssetsOnly)[]) {
        const normalized: Record<string, unknown> = {};
        for (const key of keys) {
            normalized[key] = assets[key] ?? null;
        }
        if (normalized.dependencies) {
            normalized.dependencies = parseJSON(normalized.dependencies);
        }

        return normalized;
    }

    private buildAssetsUrl(entity: AssetsDiscoveryEntity) {
        let reqUrl = entity.assetsDiscoveryUrl;

        // This implementation of communication between ILC & apps duplicates code in ILC ServerRouter
        // and so should be refactored in the future.
        const entityPropsJSON = entity.props ? JSON.stringify(entity.props) : undefined;

        if (entityPropsJSON && entityPropsJSON !== '{}') {
            const entityPropsBase64 = Buffer.from(entityPropsJSON).toString('base64');
            reqUrl = urljoin(reqUrl, `?appProps=${entityPropsBase64}`);
        }

        return reqUrl;
    }

    private async updateEntityWithNewAssets(
        entity: AssetsDiscoveryEntity,
        data: Record<string, any>,
        updatedTime: number,
    ) {
        const queryWaitTimeout = 10000;
        await this.db(this.tableName)
            .where(this.tableId, entity[this.tableId])
            .update(
                Object.assign({}, data, {
                    assetsDiscoveryUpdatedAt: updatedTime,
                }),
            )
            .timeout(queryWaitTimeout);
    }

    private async getEntitiesToRefresh(unixTimestampNow: number) {
        const updateAfter = unixTimestampNow - this.intervalSeconds;
        return this.db
            .select<AssetsDiscoveryEntity[]>()
            .from(this.tableName)
            .whereNotNull('assetsDiscoveryUrl')
            .andWhere(function () {
                this.whereNull('assetsDiscoveryUpdatedAt').orWhere('assetsDiscoveryUpdatedAt', '<', updateAfter);
            });
    }
}
