//TODO: cover with tests
const wrapWithCache = (fn, cacheParams) => {
    const {
        cacheForSeconds,
    } = cacheParams;

    const cache = {};
    const cacheResolutionPromise = {};

    return (...args) => {
        const now = Math.floor(Date.now() / 1000);
        const hash = args.length > 0 ? hashFn(JSON.stringify(args)) : '__null__';

        if (cache[hash] === undefined || cache[hash].cachedAt < now - cacheForSeconds) {
            if (cacheResolutionPromise[hash] !== undefined) {
                if (cache[hash] !== undefined) { // It's better to return stale cache rather then cause delay
                    return Promise.resolve(cache[hash]);
                }

                return cacheResolutionPromise[hash];
            }

            cacheResolutionPromise[hash] = fn(...args).then(data => {
                delete cacheResolutionPromise[hash];
                cache[hash] = {
                    data,
                    checkAfter: now + cacheForSeconds,
                    cachedAt: now,
                };

                return cache[hash];
            }).catch(err => {
                delete cacheResolutionPromise[hash];

                if (cache[hash] === undefined) {
                    return Promise.reject(err); //As someone is waiting for promise - just reject it
                } else {
                    // Here no one waiting for this promise anymore, thrown error would cause
                    // unhandled promise rejection
                    //TODO: add better error reporting
                    console.error('Error during cache update function execution');
                    console.error(err);
                }
            });

            if (cache[hash] !== undefined) { // It's better to return stale cache rather then cause delay
                return Promise.resolve(cache[hash]);
            }

            return cacheResolutionPromise[hash];
        }

        return Promise.resolve(cache[hash]);
    };
};

function hashFn(s) {
    for(var i = 0, h = 0xdeadbeef; i < s.length; i++)
        h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
    return (h ^ h >>> 16) >>> 0;
}

module.exports = wrapWithCache;
