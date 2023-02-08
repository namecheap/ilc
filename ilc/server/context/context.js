const { AsyncLocalStorage } = require('async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();

module.exports = {
    context: {
        /**
         *
         * @param {fastify.FastifyRequest} request
         * @param {Function} callback
         * @returns {unknown}
         */
        run({ request }, callback) {
            const parsedUrl = new URL(request.raw.url, `https://${request.hostname}/`);
            const store = new Map();
            store.set('reqId', request.id);
            store.set('url', request.raw.url);
            store.set('path', parsedUrl.pathname);
            store.set('domain', request.hostname);
            store.set('appLogger', request.log);

            return asyncLocalStorage.run(store, callback);
        },
        getStore: asyncLocalStorage.getStore.bind(asyncLocalStorage),
        disable: asyncLocalStorage.disable.bind(asyncLocalStorage),
        exit: asyncLocalStorage.exit.bind(asyncLocalStorage),
        enterWith: asyncLocalStorage.enterWith.bind(asyncLocalStorage),
    },
};
