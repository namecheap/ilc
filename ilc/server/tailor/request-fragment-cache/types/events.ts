import type { RefusalReason } from './refusal';

export type FragmentCacheSource = 'hit' | 'stale' | 'miss';
export type FragmentCacheEvent = FragmentCacheSource | 'refuse' | 'error';
/** Everything the HTML cache-state marker can report — the render outcomes plus 'refuse'. */
export type FragmentCacheMarker = FragmentCacheSource | 'refuse' | `refuse:${RefusalReason}`;
/** Only set on 'error' events: distinguishes a bug inside the cache module itself from an
 * ordinary upstream fragment failure (network error, timeout, non-2xx) surfacing through it. */
export type FragmentCacheErrorSource = 'cache-internal' | 'fragment';
export type FragmentCacheEventHandler = (
    event: FragmentCacheEvent,
    /** `source` says whose fault an 'error' was; `reason` says why a 'refuse' happened. Two
     * separate taxonomies, deliberately not merged into one field. */
    meta: { appId: string; source?: FragmentCacheErrorSource; reason?: RefusalReason },
) => void;
