import type { CacheableFragmentAttributes } from './../fragment-render';
import type { FragmentCacheMarker } from './types/events';

const cacheMarkers = new WeakMap<CacheableFragmentAttributes, FragmentCacheMarker>();

export function setCacheMarker(attributes: CacheableFragmentAttributes, marker: FragmentCacheMarker): void {
    cacheMarkers.set(attributes, marker);
}

export function getCacheMarker(attributes: CacheableFragmentAttributes): FragmentCacheMarker | undefined {
    return cacheMarkers.get(attributes);
}
