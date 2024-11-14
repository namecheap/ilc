import { CacheResult, CacheStorage } from '../../common/types/CacheWrapper';

export class BrowserCacheStorage implements CacheStorage {
    constructor(private readonly storage: Storage) {}

    getItem<T>(key: string): CacheResult<T> {
        const cache = this.storage.getItem(key);
        return cache ? JSON.parse(cache) : null;
    }

    setItem(key: string, cache: CacheResult<unknown>): void {
        this.storage.setItem(key, JSON.stringify(cache));
    }
}
