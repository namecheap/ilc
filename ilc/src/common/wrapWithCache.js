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

        if (localStorage.getItem(hash) === null || JSON.parse(localStorage.getItem(hash)).cachedAt < now - cacheForSeconds) {
            if (cacheResolutionPromise[hash] !== undefined) {
                if (localStorage.getItem(hash) !== null) { // It's better to return stale cache rather then cause delay
                    return Promise.resolve(JSON.parse(localStorage.getItem(hash)));
                }

                return cacheResolutionPromise[hash];
            }

            cacheResolutionPromise[hash] = fn(...args).then(data => {
                delete cacheResolutionPromise[hash];
                localStorage.setItem(hash, JSON.stringify({
                    data,
                    checkAfter: now + cacheForSeconds,
                    cachedAt: now,
                }));

                return JSON.parse(localStorage.getItem(hash));
            }).catch(err => {
                delete cacheResolutionPromise[hash];

                if (localStorage.getItem(hash) === null) {
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
                return Promise.resolve(JSON.parse(localStorage.getItem(hash)));
            }

            return cacheResolutionPromise[hash];
        }

        return Promise.resolve(JSON.parse(localStorage.getItem(hash)));
    };
};

function hashFn(str) {
    for (var i = 0, h = 0xdeadbeef; i < str.length; i++)
        h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
    return ((h ^ h >>> 16) >>> 0).toString();
}

module.exports = wrapWithCache;
