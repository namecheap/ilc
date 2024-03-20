export interface CacheResult<T> {
    data: T;
    cachedAt: number;
}

interface CacheParams {
    name: string;
    cacheForSeconds?: number;
}

export interface CacheWrapper {
    wrap<T, U extends unknown[]>(
        fn: (...args: U) => Promise<T>,
        cacheParams: CacheParams,
    ): (...args: U) => Promise<CacheResult<T>>;
}
