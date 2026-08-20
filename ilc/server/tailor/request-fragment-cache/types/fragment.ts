import type { CacheableFragmentAttributes } from '../../fragment-render';

/** Attributes narrowed by isCacheableRequest: opted in, with a TTL the policy already validated. */
export type CacheEnabledAttributes = CacheableFragmentAttributes & {
    cache: { enabled: true; ttlSeconds: number };
};
