import { CacheResult, CacheStorage } from './types/CacheWrapper';

type EvictingCacheStorageOptions = {
    maxSize: number;
};

export class EvictingCacheStorage implements CacheStorage {
    private readonly cache: Map<string, CacheResult<any>> = new Map();

    constructor(private readonly options: EvictingCacheStorageOptions) {}

    getItem<T>(key: string): CacheResult<T> | null {
        if (!this.cache.has(key)) {
            return null;
        }

        // Move the accessed key to the end to mark it as recently used
        const value = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    setItem(key: string, cache: CacheResult<unknown>): void {
        // If the key already exists, delete it to update the order
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // Add the new item to the cache
        this.cache.set(key, cache);

        // Evict the least recently used item if the cache exceeds maxSize
        if (this.cache.size > this.options.maxSize) {
            const oldestKey = this.cache.keys().next().value!; // Get the first key (LRU)
            this.cache.delete(oldestKey);
        }
    }
}
