import type { CacheStorage } from '../../../common/types/CacheWrapper';
import { nowInSec } from '../../../common/utils';
import { FragmentResponseSnapshot } from './response-snapshot';
import type { CacheLookup, Entry } from './types/cache';
import type { RefusalReason } from './types/refusal';

/** Ceiling on a refusal tombstone's lifetime; applied as min(this, ttlSeconds) so long TTLs can't disable the cache for days. */
const REFUSAL_TTL_SECONDS = 60;

export class FragmentCacheStore {
    constructor(private readonly storage: CacheStorage) {}

    lookup(key: string, ttlSeconds: number): CacheLookup {
        const cached = this.storage.getItem<Entry>(key);
        if (cached === null) {
            return { kind: 'miss' };
        }

        const now = nowInSec();
        if (cached.data.kind === 'refusal') {
            const refusalTtlSeconds = Math.min(REFUSAL_TTL_SECONDS, ttlSeconds);
            if (cached.cachedAt >= now - refusalTtlSeconds) {
                return { kind: 'refusal', reason: cached.data.reason };
            }
            this.storage.deleteItem(key);
            return { kind: 'miss' };
        }

        const fresh = cached.cachedAt >= now - ttlSeconds;
        return { kind: fresh ? 'fresh' : 'stale', snapshot: cached.data.snapshot };
    }

    /** True while `key` holds a stored response — never a refusal tombstone or nothing at all. */
    hasResponse(key: string): boolean {
        return this.storage.getItem<Entry>(key)?.data.kind === 'response';
    }

    storeResponse(key: string, snapshot: FragmentResponseSnapshot): void {
        this.storage.setItem(key, { data: { kind: 'response', snapshot } satisfies Entry, cachedAt: nowInSec() });
    }

    storeRefusal(key: string, reason: RefusalReason): void {
        this.storage.setItem(key, { data: { kind: 'refusal', reason } satisfies Entry, cachedAt: nowInSec() });
    }
}
