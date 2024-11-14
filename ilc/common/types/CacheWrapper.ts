export interface CacheResult<T> {
    data: T;
    cachedAt: number;
}

export interface CacheParams {
    name: string;
    cacheForSeconds?: number;
}
export type CacheHashFn = (value: string) => string;

export interface CacheStorage {
    getItem<T>(key: string): CacheResult<T> | null;
    setItem(key: string, cache: CacheResult<unknown>): void;
}

export interface CacheWrapper {
    wrap<T, U extends unknown[]>(
        fn: (...args: U) => Promise<T>,
        cacheParams: CacheParams,
    ): (...args: U) => Promise<CacheResult<T>>;
}
