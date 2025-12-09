const { context } = require('../context/context');
const { setErrorData } = require('../utils/helpers');

module.exports = (logger, { requestIdLogLabel }) => {
    const loggerProxyHandler = {
        get(target, prop) {
            const origMethod = target[prop];
            if (typeof origMethod == 'function') {
                return function (...args) {
                    const store = context.getStore();
                    const [arg1] = args;
                    const logContext = {
                        [requestIdLogLabel]: store.get('requestId'),
                        domain: store.get('domain'),
                        path: store.get('path'),
                    };

                    if (typeof arg1 === 'string') {
                        return origMethod.call(target, logContext, ...args);
                    }

                    if (arg1 instanceof Error) {
                        setErrorData(arg1, logContext);
                        return origMethod.apply(target, args);
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
