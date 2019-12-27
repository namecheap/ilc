const wrapFetchWithCache = (fetch, cacheParams) => {
    const {
        cacheForSeconds,
    } = cacheParams;

    let cache = null;
    let cachedAt = 0;
    let cacheResolutionPromise = null;

    return (...args) => {
        const now = Math.floor(Date.now() / 1000);

        if (cache === null || cachedAt < now - cacheForSeconds) {
            if (cacheResolutionPromise !== null) {
                if (cache !== null) { // It's better to return stale cache rather then cause delay
                    return Promise.resolve(cache);
                }

                return cacheResolutionPromise;
            }

            cacheResolutionPromise = fetch(...args).then(data => {
                cacheResolutionPromise = null;
                cachedAt = now;
                cache = {
                    data,
                    checkAfter: now + cacheForSeconds,
                };

                return cache;
            }).catch(err => {
                cacheResolutionPromise = null;

                if (cache !== null) {
                    console.error('Error refreshing cached cache...');
                    console.error(err);
                } else {
                    return Promise.reject(err);
                }
            });

            if (cache !== null) { // It's better to return stale cache rather then cause delay
                return Promise.resolve(cache);
            }

            return cacheResolutionPromise;
        }

        return Promise.resolve(cache);
    };
};

module.exports = wrapFetchWithCache;
