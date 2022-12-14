const { AsyncLocalStorage } = require('async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();

module.exports = {
    context: {
        run({ request }, callback){
            const store = new Map();
            store.set('reqId', request.id);
            store.set('url', request.raw.url);
            store.set('domain', request.hostname);

            return asyncLocalStorage.run(store, callback);
        },
        getStore: asyncLocalStorage.getStore.bind(asyncLocalStorage),
        disable: asyncLocalStorage.disable.bind(asyncLocalStorage),
        exit: asyncLocalStorage.exit.bind(asyncLocalStorage),
        enterWith: asyncLocalStorage.enterWith.bind(asyncLocalStorage),
    },
};
