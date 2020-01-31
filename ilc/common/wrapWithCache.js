const wrapWithCache = (localStorage, logger, createHash = hashFn) => (fn, cacheParams = {}) => {
    const {
        cacheForSeconds = 60,
    } = cacheParams;

    const cacheResolutionPromise = {};

    return (...args) => {
        const now = Math.floor(Date.now() / 1000);
        const hash = args.length > 0 ? createHash(JSON.stringify(args)) : '__null__';

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
                    //TODO: add better error reporting
                    logger.error('Error during cache update function execution');
                    logger.error(err);
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
    if (typeof str !== 'string') {
        throw new Error(`The provided parameter ${str} into the hash function has the type of ${typeof str} and should have the type of string!`);
    }

    for (var i = 0, h = 0xdeadbeef; i < str.length; i++)
        h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
    return ((h ^ h >>> 16) >>> 0).toString();
}

module.exports = wrapWithCache;
