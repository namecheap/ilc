import { CachedFragmentRequester } from './cached-fragment-requester';
import { FragmentResponseCache } from './response-cache';
import { createFragmentCacheStorage } from './storage-factory';
import { FragmentCacheStore } from './store';
import { resolveCapacityBudget } from './utils/capacity-budget';
import type { CacheableFragmentAttributes, FragmentRequest, RequestFragment } from '../fragment-render';
import type { FragmentCacheDeps } from './types/deps';

export {
    composeCacheKey,
    explainRequestRefusal,
    explainResponseRefusal,
    isCacheableRequest,
    isCacheableResponse,
} from './utils/policy';
export { getCacheMarker, setCacheMarker } from './marker';
export type { CacheEnabledAttributes } from './types/fragment';
export type {
    FragmentCacheErrorSource,
    FragmentCacheEvent,
    FragmentCacheEventHandler,
    FragmentCacheMarker,
} from './types/events';
export type { FragmentCacheDeps } from './types/deps';
export { REFUSAL_REASONS } from './types/refusal';
export type { RefusalReason } from './types/refusal';

// Composition root of the module: the only place where concrete adapters are constructed
export function wrapRequestFragmentWithCache(requestFragment: RequestFragment, deps: FragmentCacheDeps) {
    // resolving here fails fast on a contradictory budget, at composition time
    const capacity = resolveCapacityBudget(deps.capacity);
    const storage = deps.storage ?? createFragmentCacheStorage(deps.logger, capacity);
    const cache = new FragmentResponseCache(new FragmentCacheStore(storage), deps.logger, capacity);
    const requester = new CachedFragmentRequester(requestFragment, cache, deps);

    return function cachedRequestFragment(
        fragmentUrl: string,
        attributes: CacheableFragmentAttributes,
        request: FragmentRequest,
    ) {
        return requester.handle(fragmentUrl, attributes, request);
    };
}
