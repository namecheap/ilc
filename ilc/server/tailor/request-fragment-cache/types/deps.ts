import type { Logger } from 'ilc-plugins-sdk';
import type { CacheStorage } from '../../../../common/types/CacheWrapper';
import type { FragmentCacheEventHandler } from './events';
import type { CapacityBudget } from '../utils/capacity-budget';

export interface FragmentCacheDeps {
    storage?: CacheStorage;
    logger: Logger;
    onCacheEvent?: FragmentCacheEventHandler;
    /** Capacity knobs (defaults apply when omitted); exposed so guarantees are testable through this seam, not the internals. */
    capacity?: Partial<CapacityBudget>;
}

export type CachedFragmentRequesterDeps = Pick<FragmentCacheDeps, 'logger' | 'onCacheEvent'>;
