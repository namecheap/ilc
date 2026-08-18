import crypto from 'crypto';
import type { IncomingHttpHeaders } from 'http';
import { removeQueryParams } from '../../../../common/utils';
import type { CacheEnabledAttributes } from '../types/fragment';
import type { CacheableFragmentAttributes, SharedRenderHeaders } from '../../fragment-render';
import type { RefusalReason } from '../types/refusal';

// Keep in sync with MAX_FRAGMENT_CACHE_TTL_SECONDS in registry/server/apps/interfaces/index.ts —
// separate packages, so a drift here has no automated check.
const MAX_FRAGMENT_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Did the fragment opt in? Split out so callers before routing (the LDE bypass) can ask without duplicating the condition. */
export function explainOptInRefusal(attributes: CacheableFragmentAttributes): 'cache-disabled' | null {
    return attributes.cache?.enabled === true ? null : 'cache-disabled';
}

/**
 * Names why this request may not be served from the shared cache, or null when it may. Order
 * matters: the first failing rule is the reported reason, 'cache-disabled' checked first.
 */
export function explainRequestRefusal(
    attributes: CacheableFragmentAttributes,
    route: { specialRole?: unknown },
    varyHeaders: SharedRenderHeaders,
): RefusalReason | null {
    const notOptedIn = explainOptInRefusal(attributes);
    if (notOptedIn !== null) {
        return notOptedIn;
    }

    const ttlSeconds = attributes.cache!.ttlSeconds;
    if (typeof ttlSeconds !== 'number' || !Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
        return 'ttl-invalid';
    }
    if (ttlSeconds > MAX_FRAGMENT_CACHE_TTL_SECONDS) {
        return 'ttl-too-long';
    }
    if (attributes.wrapperConf) {
        return 'wrapper-conf';
    }
    if (attributes.forwardQuerystring) {
        return 'forward-querystring';
    }
    if (route.specialRole != null) {
        return 'special-role-route';
    }
    if (!varyHeaders['x-request-host']) {
        return 'no-vary-host';
    }
    return null;
}

export function isCacheableRequest(
    attributes: CacheableFragmentAttributes,
    route: { specialRole?: unknown },
    varyHeaders: SharedRenderHeaders,
): attributes is CacheEnabledAttributes {
    return explainRequestRefusal(attributes, route, varyHeaders) === null;
}

function forbidsReuse(cacheControl: string): boolean {
    const NON_REUSABLE_DIRECTIVES = ['no-store', 'no-cache', 'private', 'must-revalidate', 'proxy-revalidate'];

    return cacheControl
        .toLowerCase()
        .split(',')
        .map((directive) => directive.trim())
        .some((directive) => {
            // this cache never strips named fields, so a field-qualified no-cache="X"/private="X"
            // (RFC 9111 §5.2.2) must forbid reuse the same as the bare, whole-response form
            const [name] = directive.split('=', 1);
            return (
                NON_REUSABLE_DIRECTIVES.includes(name.trim()) ||
                // max-age=0 / s-maxage=0, bare or quoted, mean "already stale", unusable without revalidation
                /^(?:max-age|s-maxage)\s*=\s*"?0"?$/.test(directive)
            );
        });
}

/** Names why this response may not be admitted to the shared cache, or null when it may. */
export function explainResponseRefusal(statusCode: number, headers: IncomingHttpHeaders): RefusalReason | null {
    if (statusCode !== 200) {
        return 'status-not-200';
    }
    if (headers['set-cookie']) {
        return 'set-cookie';
    }
    const cacheControl = headers['cache-control'];
    if (typeof cacheControl === 'string' && forbidsReuse(cacheControl)) {
        return 'cache-control';
    }
    return null;
}

export function isCacheableResponse(statusCode: number, headers: IncomingHttpHeaders): boolean {
    return explainResponseRefusal(statusCode, headers) === null;
}

export function composeCacheKey({
    fragmentUrl,
    attributes,
    route,
    varyHeaders,
    l10nManifest,
}: {
    fragmentUrl: string;
    attributes: CacheableFragmentAttributes;
    route: { basePath?: string; reqUrl?: string };
    varyHeaders: SharedRenderHeaders;
    l10nManifest?: string | null;
}): string {
    const identity = JSON.stringify([
        fragmentUrl,
        attributes.id ?? null,
        route.basePath ?? null,
        route.reqUrl ? removeQueryParams(route.reqUrl) : null,
        attributes.appProps ?? null,
        l10nManifest ?? null,
        varyHeaders,
    ]);
    return crypto.createHash('sha256').update(identity).digest('hex');
}
