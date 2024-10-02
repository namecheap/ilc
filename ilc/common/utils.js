import errorExtender from '@namecheap/error-extender';
import deepmerge from 'deepmerge';

export function appIdToNameAndSlot(appId) {
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

export function makeAppId(appName, slotName) {
    return `${appName.replace('@portal/', '')}__at__${slotName}`;
}

export function cloneDeep(source) {
    return deepmerge({}, source);
}

export const uniqueArray = (array) => [...new Set(array)];

export const encodeHtmlEntities = (value) => value.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const decodeHtmlEntities = (value) =>
    value
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');

export const removeQueryParams = (url) => {
    const index = url.indexOf('?');
    if (index !== -1) {
        return url.substring(0, index);
    } else {
        return url;
    }
};

export const addTrailingSlash = (url) => {
    if (url.endsWith('/')) {
        return url;
    }

    return `${url}/`;
};

export function addTrailingSlashToPath(url) {
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
export async function withTimeout(promise, ms, message = 'Promise timeout') {
    let timeoutId;
    const timeoutPromise = new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => reject(new TimeoutError(message)), ms);
    });
    const decoratedPromise = promise.finally(() => clearTimeout(timeoutId));
    return Promise.race([decoratedPromise, timeoutPromise]);
}

export function extendError(name, options = {}) {
    return errorExtender(name, { ...options, inverse: true });
}
