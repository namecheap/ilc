const extendError = require('@namecheap/error-extender');

const errors = {};
errors.WrapWithCacheError = extendError('WrapWithCacheError');

const wrapWithCache = (localStorage, logger, createHash = hashFn) => (fn, cacheParams) => {
    const {
        cacheForSeconds = 60,
        name,
    } = cacheParams;

    if (typeof name !== 'string' || name.length === 0) {
        throw new Error('To wrap your function you should provide unique "name" to argument, to create hash-id of result of your function');
    }

    const cacheResolutionPromise = {};

    return (...args) => {
        const now = Math.floor(Date.now() / 1000);
        const hash = createHash(name + JSON.stringify(args));
        const item = localStorage.getItem(hash);
        const parsedItem = item ? JSON.parse(item) : null;

        if (parsedItem === null || parsedItem.cachedAt < now - cacheForSeconds) {
            if (cacheResolutionPromise[hash] !== undefined) {
                if (parsedItem !== null) { // It's better to return stale cache rather then cause delay
                    logger.info({
                        memoName: name,
                        hash,
                        now,
                        cachedAt: parsedItem.cachedAt
                    }, logMessage('Item read from cache. Invalidation is in progress. Cache is stale'));

                    return Promise.resolve(JSON.parse(localStorage.getItem(hash)));
                }

                return cacheResolutionPromise[hash];
            }

            logger.info({
                memoName: name,
                hash,
                now,
                cachedAt: parsedItem ? parsedItem.cachedAt : undefined
            }, logMessage('Invalidation started'));

            cacheResolutionPromise[hash] = fn(...args).then(data => {
                delete cacheResolutionPromise[hash];
                localStorage.setItem(hash, JSON.stringify({
                    data,
                    checkAfter: now + cacheForSeconds,
                    cachedAt: now,
                }));

                logger.info({
                    memoName: name,
                    hash,
                    now,
                    cachedAt: parsedItem ? parsedItem.cachedAt : undefined
                }, logMessage('Item read from API. Invalidation finished.'));

                return JSON.parse(localStorage.getItem(hash));
            }).catch(err => {
                delete cacheResolutionPromise[hash];

                if (localStorage.getItem(hash) === null) {
                    logger.info({
                        memoName: name,
                        hash,
                        now,
                        cachedAt: parsedItem ? parsedItem.cachedAt : undefined
                    }, logMessage('Invalidation error with promise rejection'));
                    return Promise.reject(err); //As someone is waiting for promise - just reject it
                } else {
                    // Here no one waiting for this promise anymore, thrown error would cause
                    // unhandled promise rejection
                    const error = new errors.WrapWithCacheError({
                        message: 'Error during cache update function execution',
                        cause: err
                    });
                    logger.error(error);
                }
            });

            if (localStorage.getItem(hash) !== null) { // It's better to return stale cache rather then cause delay
                logger.info({
                    memoName: name,
                    hash,
                    now,
                    cachedAt: JSON.parse(localStorage.getItem(hash)).cachedAt
                }, logMessage('Item read from cache. Magic condition.'));
                return Promise.resolve(JSON.parse(localStorage.getItem(hash)));
            }

            return cacheResolutionPromise[hash];
        }

        // const item = localStorage.getItem(hash);

        logger.info({
            memoName: name,
            now,
            cachedAt: parsedItem.cachedAt
        }, logMessage('Item read from cache'));

        return Promise.resolve(parsedItem);
    };
};

function hashFn(str) {
    for (var i = 0, h = 0xdeadbeef; i < str.length; i++)
        h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
    return ((h ^ h >>> 16) >>> 0).toString();
}

function logMessage(str) {
    return `[ILC Cache]: ${str}`;
}

module.exports = wrapWithCache;
