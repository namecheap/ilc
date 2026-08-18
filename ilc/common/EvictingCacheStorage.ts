import { CacheResult, CacheStorage } from './types/CacheWrapper';

type EvictingCacheStorageOptions = {
    maxSize: number;
    maxWeight?: number;
    getWeight?: (cache: CacheResult<unknown>) => number;
    onEvict?: (evictedKey: string) => void;
};

export class EvictingCacheStorage implements CacheStorage {
    private readonly cache: Map<string, CacheResult<any>> = new Map();
    private totalWeight = 0;

    constructor(private readonly options: EvictingCacheStorageOptions) {}

    getItem<T>(key: string): CacheResult<T> | null {
        const value = this.cache.get(key);
        if (value === undefined) {
            return null;
        }

        // Move the accessed key to the end to mark it as recently used
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    deleteItem(key: string): void {
        const existing = this.cache.get(key);
        if (existing !== undefined) {
            this.totalWeight -= this.getWeight(existing);
        }
        this.cache.delete(key);
    }

    setItem(key: string, cache: CacheResult<unknown>): void {
        this.deleteItem(key);

        this.cache.set(key, cache);
        this.totalWeight += this.getWeight(cache);

        while (this.cache.size > this.options.maxSize || this.isOverWeightBudget()) {
            const oldestKey = this.cache.keys().next().value!; // Get the first key (LRU)
            this.deleteItem(oldestKey);
            this.options.onEvict?.(oldestKey);
        }
    }

    private getWeight(cache: CacheResult<unknown>): number {
        return this.options.getWeight?.(cache) ?? 0;
    }

    private isOverWeightBudget(): boolean {
        return this.options.maxWeight !== undefined && this.totalWeight > this.options.maxWeight;
    }
}
