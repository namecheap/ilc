import errorExtender, { type ExtendConfig } from '@namecheap/error-extender';
import deepmerge from 'deepmerge';

type NameAndSlot = {
    appName: string;
    slotName: string;
};
export function appIdToNameAndSlot(appId: string): NameAndSlot {
    const [appNameWithoutPrefix, slotName] = appId.split('__at__');

    // Case for shared libraries
    if (appNameWithoutPrefix === undefined || slotName === undefined) {
        return {
            appName: appId,
            slotName: 'none',
        };
    }

    return {
        appName: `@portal/${appNameWithoutPrefix}`,
        slotName,
    };
}

export function makeAppId(appName: string, slotName: string): string {
    return `${appName.replace('@portal/', '')}__at__${slotName}`;
}

export function cloneDeep<T extends object>(source: T): T {
    return deepmerge<T>({}, source);
}

export const uniqueArray = <T>(array: T[]): T[] => [...new Set(array)];

export const encodeHtmlEntities = (value: string): string =>
    value.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const decodeHtmlEntities = (value: string): string =>
    value
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');

export const removeQueryParams = (url: string): string => {
    const index = url.indexOf('?');
    if (index !== -1) {
        return url.substring(0, index);
    } else {
        return url;
    }
};

export const addTrailingSlash = (url: string): string => {
    if (url.endsWith('/')) {
        return url;
    }

    return `${url}/`;
};

export function addTrailingSlashToPath(url: string): string {
    const isFullUrl = url.includes('://');
    const parsedUrl = isFullUrl ? new URL(url) : new URL(`https://example.com/${url}`);
    const hasTrailingSlash = parsedUrl.pathname.endsWith('/');
    const slash = hasTrailingSlash ? '' : '/';
    parsedUrl.pathname += slash;
    return isFullUrl ? parsedUrl.toString() : parsedUrl.pathname.slice(1);
}

export class TimeoutError extends Error {}

/**
 *
 * @param {Promise}
 * @param {number} timeout
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, message = 'Promise timeout'): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((resolve, reject) => {
        timeoutId = setTimeout(() => reject(new TimeoutError(message)), ms);
    });
    const decoratedPromise = promise.finally(() => clearTimeout(timeoutId));
    return Promise.race([decoratedPromise, timeoutPromise]);
}

export function extendError<T>(name: string, options: ExtendConfig<T> = {}) {
    return errorExtender(name, { ...options, inverse: true });
}
