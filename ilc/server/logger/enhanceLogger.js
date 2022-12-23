const { context } = require('../context/context');

module.exports = (logger, { reqIdKey }) => {
    const requestIdKey = reqIdKey || 'operationId';

    const loggerProxyHandler = {
        get(target, prop) {
            const origMethod = target[prop];
            if (typeof origMethod == 'function') {
                return function (...args) {
                    const store = context.getStore();
                    const [arg1] = args;
                    const logContext = {
                        [requestIdKey]: store.get('reqId'),
                        domain: store.get('domain'),
                    };

                    if (arg1 === 'string') {
                        return origMethod.call(target, logContext, ...args);
                    }

                    if (typeof arg1 === 'object' && arg1 !== null) {
                        return origMethod.call(target, { ...logContext, ...arg1 }, ...args.splice(1));
                    }

                    return origMethod.apply(target, args);
                };
            }
        },
    };

    return new Proxy(logger, loggerProxyHandler);
};
