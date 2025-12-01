import axios, { AxiosResponse } from 'axios';
import urljoin from 'url-join';
import deepEqual from 'deep-equal';

import knex from '../../../db';
import manifestProcessor, { ManifestData } from './assetsManifestProcessor';
import AssetsDiscoveryWhiteLists from './AssetsDiscoveryWhiteLists';
import { getLogger } from '../../../util/logger';
import { parseJSON, safeParseJSON } from '../json';
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

    private intervalSeconds: number;

    constructor(
        tableName: keyof typeof AssetsDiscoveryWhiteLists,
        { tableId = 'name' as const, intervalSeconds = 5 } = {},
    ) {
        this.tableName = tableName;
        this.tableId = tableId;
        this.intervalSeconds = intervalSeconds;
    }

    start(delay: number = 1000) {
        const runLoop = () => {
            this.timerId = setTimeout(async () => {
                await this.iteration().catch((err) => {
                    getLogger().error(err, 'Error during refresh of the assets info:');
                });
                runLoop();
            }, delay);
        };

        runLoop();
    }

    stop() {
        clearTimeout(this.timerId!);
    }

    private async iteration() {
        return newrelic.startBackgroundTransaction(this.tableName, AssetsDiscovery.constructor.name, async () => {
            const now = Math.floor(Date.now() / 1000);
            const entities = await this.getEntitiesToRefresh(now);

            for (const entity of entities) {
                try {
                    await this.processEntity(entity, now);
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
        const data = manifestProcessor(reqUrl, res.data, AssetsDiscoveryWhiteLists[this.tableName]);
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

    private isAssetsEqual(manifestAssets: ManifestData, dbAssets: DbAssetsOnly) {
        const shallowCopyDbAssets = Object.assign({}, dbAssets);
        if (shallowCopyDbAssets.dependencies) {
            shallowCopyDbAssets.dependencies = parseJSON(shallowCopyDbAssets.dependencies);
        }

        return deepEqual(shallowCopyDbAssets, manifestAssets);
    }

    private buildAssetsUrl(entity: AssetsDiscoveryEntity) {
        let reqUrl = entity.assetsDiscoveryUrl;

        // This implementation of communication between ILC & apps duplicates code in ILC ServerRouter
        // and so should be refactored in the future.
        let entityPropsJSON: string | null | undefined;

        if (typeof entity.props === 'object' && entity.props !== null) {
            // Props is already an object (PostgreSQL behavior)
            entityPropsJSON = JSON.stringify(entity.props);
        } else if (typeof entity.props === 'string') {
            // Props is a string (MySQL and SQLite behavior) - normalize by parsing and converting back
            // to ensure consistent JSON formatting (MySQL adds spaces, SQLite doesn't)
            const parsed = parseJSON(entity.props);
            entityPropsJSON = parsed ? JSON.stringify(parsed) : entity.props;
        } else {
            entityPropsJSON = entity.props;
        }

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
        await knex(this.tableName)
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
        return knex
            .select<AssetsDiscoveryEntity[]>()
            .from(this.tableName)
            .whereNotNull('assetsDiscoveryUrl')
            .andWhere(function () {
                this.whereNull('assetsDiscoveryUpdatedAt').orWhere('assetsDiscoveryUpdatedAt', '<', updateAfter);
            });
    }
}
