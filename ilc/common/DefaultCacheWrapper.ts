import { Logger } from 'ilc-plugins-sdk';
import { CacheHashFn, CacheParams, CacheResult, CacheStorage, CacheWrapper } from './types/CacheWrapper';
import { Context } from './types/Context';
import { extendError, withTimeout } from './utils';

const CacheWrapperError = extendError('CacheWrapperError', { defaultData: {} });

type CachePromises = {
    [k: string]: Promise<any>;
};

const defaultHashFn: CacheHashFn = (str) => {
    for (var i = 0, h = 0xdeadbeef; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
    return ((h ^ (h >>> 16)) >>> 0).toString();
};

export class DefaultCacheWrapper implements CacheWrapper {
    private cacheRenewPromises: CachePromises = {};

    constructor(
        private readonly storage: CacheStorage,
        private readonly logger: Logger,
        private readonly context?: Context | null,
        private readonly createHash: CacheHashFn = defaultHashFn,
    ) {}

    private getCache<T>(hash: string): CacheResult<T> | null {
        return this.storage.getItem(hash);
    }

    private setCache<T>(hash: string, cache: CacheResult<T>): void {
        this.storage.setItem(hash, cache);
    }

    private nowInSec(): number {
        return Math.floor(Date.now() / 1000);
    }

    private logMessage(str: string): string {
        return `[ILC Cache]: ${str}`;
    }

    private getRequestId(): string | undefined {
        if (this.context) {
            const contextStore = this.context.getStore();
            return contextStore?.get('requestId');
        }

        return undefined;
    }

    public wrap<T, U extends unknown[]>(
        fn: (...args: U) => Promise<T>,
        cacheParams: CacheParams,
    ): (...args: U) => Promise<CacheResult<T>> {
        const { name: memoName, cacheForSeconds = 60 } = cacheParams;

        if (typeof memoName !== 'string' || memoName.length === 0) {
            throw new Error(
                'To wrap your function you should provide unique "name" to argument, to create hash-id of result of your function',
            );
        }

        return (...args) => {
            const now = this.nowInSec();
            const hash = this.createHash(`${memoName}${cacheForSeconds}${JSON.stringify(args)}`);

            const logInfo = {
                now,
                hash,
                memoName,
                id: this.getRequestId(),
            };

            const cache = this.getCache(hash);
            const cacheIsActual = cache !== null && cache.cachedAt >= now - cacheForSeconds;

            // Return cache if actual
            if (cacheIsActual) {
                this.logger.info(
                    {
                        ...logInfo,
                        cachedAt: cache.cachedAt,
                    },
                    this.logMessage('Item read from cache. Cache is actual'),
                );

                return Promise.resolve(cache);
            }

            const cacheRenewInProgress = this.cacheRenewPromises[hash] !== undefined;

            if (cacheRenewInProgress) {
                // If cache is stale, but renew is in progress - return stale cache
                // otherwise return renew promise
                if (cache !== null) {
                    this.logger.info(
                        {
                            ...logInfo,
                            cachedAt: cache.cachedAt,
                        },
                        this.logMessage('Item read from cache. Invalidation is in progress. Cache is stale'),
                    );

                    return Promise.resolve(cache);
                }

                return this.cacheRenewPromises[hash];
            }

            this.logger.info(
                {
                    ...logInfo,
                    cachedAt: (cache || {}).cachedAt,
                },
                this.logMessage('Invalidation started'),
            );

            // Start cache renew
            this.cacheRenewPromises[hash] = withTimeout(
                fn(...args),
                cacheForSeconds * 1000,
                `Cache ${memoName} update timeout ${cacheForSeconds}s`,
            )
                .then((data) => {
                    const now = this.nowInSec();

                    const renewedCache = {
                        data,
                        cachedAt: now,
                    };

                    this.setCache(hash, renewedCache);

                    delete this.cacheRenewPromises[hash];

                    this.logger.info(
                        {
                            ...logInfo,
                            now,
                            cachedAt: renewedCache.cachedAt,
                        },
                        this.logMessage('Invalidation finished'),
                    );

                    return renewedCache;
                })
                .catch((err) => {
                    delete this.cacheRenewPromises[hash];

                    if (cache === null) {
                        this.logger.info(
                            {
                                ...logInfo,
                            },
                            this.logMessage('Invalidation error'),
                        );

                        // As someone is waiting for promise - just reject it
                        return Promise.reject(err);
                    } else {
                        // Here no one waiting for this promise anymore, thrown error would cause
                        // unhandled promise rejection
                        const error = new CacheWrapperError({
                            cause: err,
                            message: 'Error during cache update function execution',
                        });

                        this.logger.error(error);
                    }
                });

            // Return stale cache instead of waiting for renew
            if (cache !== null) {
                this.logger.info(
                    {
                        ...logInfo,
                        cachedAt: cache.cachedAt,
                    },
                    this.logMessage(
                        'Item read from cache. Invalidation is in progress since current request. Cache is stale',
                    ),
                );

                return Promise.resolve(cache);
            }

            this.logger.info(
                {
                    ...logInfo,
                },
                this.logMessage('Item read from API. Can not find anything in stale cache'),
            );

            return this.cacheRenewPromises[hash];
        };
    }
}
