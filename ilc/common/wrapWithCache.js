const extendError = require('@namecheap/error-extender');
const errors = {};
errors.WrapWithCacheError = extendError('WrapWithCacheError');

const wrapWithCache =
    (localStorage, logger, createHash = hashFn) =>
    (fn, cacheParams, contextStore) => {
        const { name: memoName, cacheForSeconds = 60 } = cacheParams;

        if (typeof memoName !== 'string' || memoName.length === 0) {
            throw new Error(
                'To wrap your function you should provide unique "name" to argument, to create hash-id of result of your function',
            );
        }

        const cacheRenewPromise = {};

        return (...args) => {
            const now = nowInSec();
            const hash = createHash(memoName + JSON.stringify(args));

            const logInfo = {
                now,
                hash,
                memoName,
                id: contextStore && contextStore.get('reqId'),
            };

            const getCache = () => {
                const cache = localStorage.getItem(hash);
                return cache ? JSON.parse(cache) : null;
            };

            const setCache = (cache) => {
                localStorage.setItem(hash, JSON.stringify(cache));
            };

            const cache = getCache();
            const cacheIsActual = cache !== null && cache.cachedAt >= now - cacheForSeconds;

            // Return cache if actual
            if (cacheIsActual) {
                logger.info(
                    {
                        ...logInfo,
                        cachedAt: cache.cachedAt,
                    },
                    logMessage('Item read from cache. Cache is actual'),
                );

                return Promise.resolve(cache);
            }

            const cacheRenewInProgress = cacheRenewPromise[hash] !== undefined;

            if (cacheRenewInProgress) {
                // If cache is stale, but renew is in progress - return stale cache
                // otherwise return renew promise
                if (cache !== null) {
                    logger.info(
                        {
                            ...logInfo,
                            cachedAt: cache.cachedAt,
                        },
                        logMessage('Item read from cache. Invalidation is in progress. Cache is stale'),
                    );

                    return Promise.resolve(cache);
                }

                return cacheRenewPromise[hash];
            }

            logger.info(
                {
                    ...logInfo,
                    cachedAt: (cache || {}).cachedAt,
                },
                logMessage('Invalidation started'),
            );

            // Start cache renew
            cacheRenewPromise[hash] = fn(...args)
                .then((data) => {
                    const now = nowInSec();

                    const renewedCache = {
                        data,
                        cachedAt: now,
                    };

                    setCache(renewedCache);

                    delete cacheRenewPromise[hash];

                    logger.info(
                        {
                            ...logInfo,
                            now,
                            cachedAt: renewedCache.cachedAt,
                        },
                        logMessage('Invalidation finished'),
                    );

                    return renewedCache;
                })
                .catch((err) => {
                    delete cacheRenewPromise[hash];

                    if (cache === null) {
                        logger.info(
                            {
                                ...logInfo,
                            },
                            logMessage('Invalidation error'),
                        );

                        // As someone is waiting for promise - just reject it
                        return Promise.reject(err);
                    } else {
                        // Here no one waiting for this promise anymore, thrown error would cause
                        // unhandled promise rejection
                        const error = new errors.WrapWithCacheError({
                            cause: err,
                            message: 'Error during cache update function execution',
                        });

                        logger.error(error);
                    }
                });

            // Return stale cache instead of waiting for renew
            if (cache !== null) {
                logger.info(
                    {
                        ...logInfo,
                        cachedAt: cache.cachedAt,
                    },
                    logMessage(
                        'Item read from cache. Invalidation is in progress since current request. Cache is stale',
                    ),
                );

                return Promise.resolve(cache);
            }

            logger.info(
                {
                    ...logInfo,
                },
                logMessage('Item read from API. Can not find anything in stale cache'),
            );

            return cacheRenewPromise[hash];
        };
    };

function nowInSec() {
    return Math.floor(Date.now() / 1000);
}

function hashFn(str) {
    for (var i = 0, h = 0xdeadbeef; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
    return ((h ^ (h >>> 16)) >>> 0).toString();
}

function logMessage(str) {
    return `[ILC Cache]: ${str}`;
}

module.exports = wrapWithCache;
