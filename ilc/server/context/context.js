const { AsyncLocalStorage } = require('async_hooks');
const parseUrl = require('parseurl');
const asyncLocalStorage = new AsyncLocalStorage();

module.exports = {
    context: {
        /**
         *
         * @param {fastify.FastifyRequest} request
         * @param {Function} callback
         * @returns {unknown}
         */
        run({ request, requestId }, callback) {
            const parsedUrl = parseUrl(request.raw);
            const store = new Map();

            store.set('url', request.raw.url);
            store.set('protocol', request.raw.socket.encrypted ? 'https' : 'http');
            store.set('path', parsedUrl.pathname);
            store.set('domain', request.hostname);
            store.set('requestId', requestId);

            return asyncLocalStorage.run(store, callback);
        },
        getStore: asyncLocalStorage.getStore.bind(asyncLocalStorage),
        disable: asyncLocalStorage.disable.bind(asyncLocalStorage),
        exit: asyncLocalStorage.exit.bind(asyncLocalStorage),
        enterWith: asyncLocalStorage.enterWith.bind(asyncLocalStorage),
    },
    asyncLocalStorage,
};
