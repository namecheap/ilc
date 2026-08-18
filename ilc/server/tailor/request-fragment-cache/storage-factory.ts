import type { Logger } from 'ilc-plugins-sdk';
import { EvictingCacheStorage } from '../../../common/EvictingCacheStorage';
import type { CacheStorage } from '../../../common/types/CacheWrapper';
import type { Entry } from './types/cache';
import { DEFAULT_CAPACITY_BUDGET, type CapacityBudget } from './utils/capacity-budget';

/** Default bounded storage for the fragment cache; invoked by the composition root only. */
export function createFragmentCacheStorage(
    logger: Logger,
    capacity: CapacityBudget = DEFAULT_CAPACITY_BUDGET,
): CacheStorage {
    const { maxEntries, maxTotalBodyBytes } = capacity;

    return new EvictingCacheStorage({
        maxSize: maxEntries,
        maxWeight: maxTotalBodyBytes,
        getWeight: (cache) => {
            const entry = cache.data as Entry;
            return entry.kind === 'response' ? entry.snapshot.byteLength : 0;
        },
        onEvict: (key) =>
            logger.warn(
                { key },
                `ILC fragment cache eviction: limits (${maxEntries} entries / ${maxTotalBodyBytes} bytes) exceeded`,
            ),
    });
}
