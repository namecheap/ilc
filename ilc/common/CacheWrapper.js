const extendError = require('@namecheap/error-extender');

const errors = {};
errors.CacheWrapperError = extendError('CacheWrapperError');

class CacheWrapper {
    #cacheRenewPromise = {};

    constructor(localStorage, logger, context, createHash = hashFn) {
        this.logger = logger;
        this.context = context;
        this.storage = localStorage;
        this.createHash = createHash;
    }

    #getCache(hash) {
        const cache = this.storage.getItem(hash);
        return cache ? JSON.parse(cache) : null;
    }

    #setCache(hash, cache) {
        this.storage.setItem(hash, JSON.stringify(cache));
    }

    #nowInSec() {
        return Math.floor(Date.now() / 1000);
    }

    #logMessage(str) {
        return `[ILC Cache]: ${str}`;
    }

    wrap(fn, cacheParams) {
        const { name: memoName, cacheForSeconds = 60 } = cacheParams;

        if (typeof memoName !== 'string' || memoName.length === 0) {
            throw new Error(
                'To wrap your function you should provide unique "name" to argument, to create hash-id of result of your function',
            );
        }

        return (...args) => {
            const now = this.#nowInSec();
            const hash = this.createHash(`${memoName}${cacheForSeconds}${JSON.stringify(args)}`);

            const logInfo = {
                now,
                hash,
                memoName,
                id: this.context && this.context.get('reqId'),
            };

            const cache = this.#getCache(hash);
            const cacheIsActual = cache !== null && cache.cachedAt >= now - cacheForSeconds;

            // Return cache if actual
            if (cacheIsActual) {
                this.logger.info(
                    {
                        ...logInfo,
                        cachedAt: cache.cachedAt,
                    },
                    this.#logMessage('Item read from cache. Cache is actual'),
                );

                return Promise.resolve(cache);
            }

            const cacheRenewInProgress = this.#cacheRenewPromise[hash] !== undefined;

            if (cacheRenewInProgress) {
                // If cache is stale, but renew is in progress - return stale cache
                // otherwise return renew promise
                if (cache !== null) {
                    this.logger.info(
                        {
                            ...logInfo,
                            cachedAt: cache.cachedAt,
                        },
                        this.#logMessage('Item read from cache. Invalidation is in progress. Cache is stale'),
                    );

                    return Promise.resolve(cache);
                }

                return this.#cacheRenewPromise[hash];
            }

            this.logger.info(
                {
                    ...logInfo,
                    cachedAt: (cache || {}).cachedAt,
                },
                this.#logMessage('Invalidation started'),
            );

            // Start cache renew
            this.#cacheRenewPromise[hash] = fn(...args)
                .then((data) => {
                    const now = this.#nowInSec();

                    const renewedCache = {
                        data,
                        cachedAt: now,
                    };

                    this.#setCache(hash, renewedCache);

                    delete this.#cacheRenewPromise[hash];

                    this.logger.info(
                        {
                            ...logInfo,
                            now,
                            cachedAt: renewedCache.cachedAt,
                        },
                        this.#logMessage('Invalidation finished'),
                    );

                    return renewedCache;
                })
                .catch((err) => {
                    delete this.#cacheRenewPromise[hash];

                    if (cache === null) {
                        this.logger.info(
                            {
                                ...logInfo,
                            },
                            this.#logMessage('Invalidation error'),
                        );

                        // As someone is waiting for promise - just reject it
                        return Promise.reject(err);
                    } else {
                        // Here no one waiting for this promise anymore, thrown error would cause
                        // unhandled promise rejection
                        const error = new errors.CacheWrapperError({
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
                    this.#logMessage(
                        'Item read from cache. Invalidation is in progress since current request. Cache is stale',
                    ),
                );

                return Promise.resolve(cache);
            }

            this.logger.info(
                {
                    ...logInfo,
                },
                this.#logMessage('Item read from API. Can not find anything in stale cache'),
            );

            return this.#cacheRenewPromise[hash];
        };
    }
}

function hashFn(str) {
    for (var i = 0, h = 0xdeadbeef; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
    return ((h ^ (h >>> 16)) >>> 0).toString();
}

module.exports = CacheWrapper;
