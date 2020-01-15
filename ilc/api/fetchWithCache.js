const fetchWithCacheFactory = (fetch, cacheParams = {}) => {
    const {
        cacheForSeconds = 5,
    } = cacheParams;

    let _data = null;
    let _cachedAt = 0;
    let _cacheResolutionPromise = null;

    return (...args) => {
        const now = Math.floor(Date.now() / 1000);

        if (_data === null || _cachedAt < now - cacheForSeconds) {
            if (_cacheResolutionPromise !== null) {
                if (_data !== null) { // It's better to return stale data rather then cause delay
                    return Promise.resolve(_data);
                }

                return _cacheResolutionPromise;
            }

            _cacheResolutionPromise = fetch(...args).then(data => {
                _cacheResolutionPromise = null;
                _cachedAt = now;
                _data = {
                    data,
                    checkAfter: now + cacheForSeconds,
                };

                return _data;
            }).catch(err => {
                _cacheResolutionPromise = null;

                if (_data !== null) {
                    console.error('Error refreshing cached data...');
                    console.error(err);
                } else {
                    return Promise.reject(err);
                }
            });

            if (_data !== null) { // It's better to return stale data rather then cause delay
                return Promise.resolve(_data);
            }

            return _cacheResolutionPromise;
        }

        return Promise.resolve(_data);
    };
};

module.exports = fetchWithCacheFactory;
