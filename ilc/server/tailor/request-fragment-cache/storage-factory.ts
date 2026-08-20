import type { Logger } from 'ilc-plugins-sdk';
import { EvictingCacheStorage } from '../../../common/EvictingCacheStorage';
import type { CacheStorage } from '../../../common/types/CacheWrapper';
import type { Entry } from './types/cache';
import { DEFAULT_CAPACITY_BUDGET, type CapacityBudget } from './utils/capacity-budget';

const EVICTION_REPORT_INTERVAL_MS = 60_000;

/** Default bounded storage for the fragment cache; invoked by the composition root only. */
export function createFragmentCacheStorage(
    logger: Logger,
    capacity: CapacityBudget = DEFAULT_CAPACITY_BUDGET,
): CacheStorage {
    const { maxEntries, maxTotalBodyBytes } = capacity;

    // A working set over budget evicts on every insert, so a line per eviction restates one
    // steady state endlessly. Report it once per interval, with the count.
    let evictedSinceReport = 0;
    let lastReportAt: number | null = null;

    const reportEviction = (key: string): void => {
        evictedSinceReport += 1;
        const now = Date.now();
        if (lastReportAt !== null && now - lastReportAt < EVICTION_REPORT_INTERVAL_MS) {
            return;
        }

        lastReportAt = now;
        logger.warn(
            { key, evictedSinceLastReport: evictedSinceReport },
            `ILC fragment cache eviction: limits (${maxEntries} entries / ${maxTotalBodyBytes} bytes) exceeded`,
        );
        evictedSinceReport = 0;
    };

    return new EvictingCacheStorage({
        maxSize: maxEntries,
        maxWeight: maxTotalBodyBytes,
        getWeight: (cache) => {
            const entry = cache.data as Entry;
            return entry.kind === 'response' ? entry.snapshot.byteLength : 0;
        },
        onEvict: reportEviction,
    });
}
