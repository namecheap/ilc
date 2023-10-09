import { Logger } from 'ilc-plugins-sdk';
import { getPluginManagerInstance } from './pluginManager';
import { storage } from '../middleware/context';
import errorExtender, { ExtendedError } from '@namecheap/error-extender';

const hasKey = <T extends object>(obj: T, k: keyof any): k is keyof T => k in obj;

const loggerProxyHandler: ProxyHandler<Logger> = {
    get(target, prop) {
        const originalMember = hasKey(target, prop) && target[prop];
        if (typeof originalMember !== 'function') {
            return originalMember;
        }
        const requestIdKey = getPluginManagerInstance().getReportingPlugin().requestIdLogLabel ?? 'operationId';
        return function (
            ...args:
                | [arg1: object | Error | ExtendedError, arg2: string | undefined, ...args: any[]]
                | [arg1: string, ...args: any[]]
        ) {
            const store = storage.getStore();
            const [arg1, ...restArgs] = args;
            const logContext = {
                [requestIdKey]: store?.get('reqId'),
                domain: store?.get('domain'),
                userId: store?.get('user')?.identifier,
            };

            if (typeof arg1 === 'string') {
                return originalMember.call(target, logContext, ...args);
            }

            if (arg1 instanceof Error) {
                if ('data' in arg1 && typeof arg1['data'] === 'object' && arg1['data'] !== null) {
                    Object.assign(arg1['data'], logContext);
                    return originalMember.apply(target, args);
                } else {
                    const ExtendedError = errorExtender(arg1.name);
                    const errorWithData = new ExtendedError({ message: arg1.message, data: logContext, cause: arg1 });
                    return originalMember.call(target, errorWithData, ...restArgs);
                }
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
