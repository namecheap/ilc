import { Logger } from 'ilc-plugins-sdk';
import { getPluginManagerInstance } from './pluginManager';
import { storage, Store } from '../middleware/context';
import { setErrorData } from './helpers';

type LogContext = Omit<Store, 'user' | 'reqId'> & {
    userId?: string;
};

type NoContext = {
    asyncContext: 'none';
};

const hasKey = <T extends object>(obj: T, k: keyof any): k is keyof T => k in obj;

const loggerProxyHandler: ProxyHandler<Logger> = {
    get(target, prop) {
        const originalMember = hasKey(target, prop) && target[prop];
        if (typeof originalMember !== 'function') {
            return originalMember;
        }
        const requestIdKey = getPluginManagerInstance().getReportingPlugin().requestIdLogLabel ?? 'operationId';
        return function (
            ...args: [arg1: object | Error, arg2: string | undefined, ...args: any[]] | [arg1: string, ...args: any[]]
        ) {
            const store = storage.getStore();
            const [arg1, ...restArgs] = args;
            const logContext: LogContext | NoContext = store
                ? {
                      [requestIdKey]: store.get('reqId'),
                      domain: store.get('domain'),
                      userId: store.get('user')?.identifier,
                      path: store.get('path'),
                      clientIp: store.get('clientIp'),
                  }
                : {
                      asyncContext: 'none',
                  };

            if (typeof arg1 === 'string') {
                return originalMember.call(target, logContext, ...args);
            }

            if (arg1 instanceof Error) {
                setErrorData(arg1, logContext);
                return originalMember.apply(target, args);
            }

            if (typeof arg1 === 'object' && arg1 !== null) {
                return originalMember.call(target, { ...logContext, ...arg1 }, ...restArgs);
            }

            return originalMember.apply(target, args);
        };
    },
};

let logger: Logger;

const consoleAdapter: Logger = {
    fatal: (...args) => console.error(...args),
    error: (...args) => console.error(...args),
    warn: (...args) => console.warn(...args),
    info: (...args) => console.info(...args),
    debug: (...args) => console.debug(...args),
    trace: (...args) => console.trace(...args),
};

export function getLogger(): Logger {
    if (!logger) {
        try {
            const pluginManager = getPluginManagerInstance();
            const pluginLogger = pluginManager.getReportingPlugin().logger;
            logger = new Proxy(pluginLogger, loggerProxyHandler);
        } catch (err) {
            console.error("Logger wasn't initialized, fallback to console");
            return consoleAdapter;
        }
    }
    return logger;
}
