import { CacheResult, CacheStorage } from './types/CacheWrapper';

export class MemoryCacheStorage implements CacheStorage {
    private readonly cache: Record<string, CacheResult<any>> = {};

    getItem<T>(key: string): CacheResult<T> | null {
        return this.cache[key] ?? null;
    }
    setItem(key: string, cache: CacheResult<unknown>): void {
        this.cache[key] = cache;
    }
}
