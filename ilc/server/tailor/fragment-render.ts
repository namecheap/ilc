import type { IncomingHttpHeaders } from 'http';
import type { Readable } from 'stream';

/**
 * Vocabulary of a fragment render, shared by the transport and the cache wrapping it. Lives here,
 * not in request-fragment-cache/, so deleting the cache can't break the transport's build.
 */

declare const sharedRenderHeadersBrand: unique symbol;

export interface FragmentCacheConfig {
    enabled: boolean;
    ttlSeconds?: number;
}

export interface CacheableFragmentAttributes {
    id?: string;
    cache?: FragmentCacheConfig | null;
    wrapperConf?: object | null;
    forwardQuerystring?: boolean;
    appProps?: object | null;
    timeout?: number;
}

export type FragmentResponse = Readable & {
    statusCode: number;
    headers: IncomingHttpHeaders;
};

export interface FragmentRequest {
    id?: string;
    headers: IncomingHttpHeaders;
    host?: string;
    ldeRelated?: boolean;
    registryConfig: {
        apps: Record<string, { l10nManifest?: string | null }>;
        settings?: { fragmentProxyHeaders?: string[] };
    };
    router: {
        getRoute(): {
            basePath?: string;
            reqUrl?: string;
            route?: string;
            specialRole?: unknown;
        };
    };
}

export type SharedRenderHeaders = Readonly<Record<string, string>> & {
    readonly [sharedRenderHeadersBrand]: true;
};

// varyHeaders is required on a shared render: it's the same value used for the cache key, so the
// key and the forwarded headers can't diverge (see cached-fragment-requester.ts's requestCached()).
export type FragmentRenderOptions = { mode: 'private' } | { mode: 'shared'; varyHeaders: SharedRenderHeaders };

export type RequestFragment = (
    fragmentUrl: string,
    attributes: CacheableFragmentAttributes,
    request: FragmentRequest,
    options?: FragmentRenderOptions,
) => Promise<FragmentResponse>;

/**
 * The only request headers a shared render may see. The same set is what the cache key varies on,
 * so a header can never reach a shared render without also being part of its identity.
 */
export const SHARED_RENDER_HEADERS: readonly string[] = ['x-request-host', 'x-request-intl'];

export function pickHeaders(headers: IncomingHttpHeaders, isAllowed: (key: string) => boolean): Record<string, string> {
    return Object.keys(headers).reduce<Record<string, string>>((selected, key) => {
        const value = headers[key];
        if (isAllowed(key) && value) {
            selected[key] = value as string;
        }
        return selected;
    }, {});
}

export function pickSharedRenderHeaders(headers: IncomingHttpHeaders = {}): SharedRenderHeaders {
    return pickHeaders(headers, (key) => SHARED_RENDER_HEADERS.includes(key)) as SharedRenderHeaders;
}
