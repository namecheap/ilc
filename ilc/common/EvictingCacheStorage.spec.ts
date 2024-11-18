import { expect } from 'chai';
import { EvictingCacheStorage } from './EvictingCacheStorage';

describe('EvictingCacheStorage', () => {
    let cache: EvictingCacheStorage;

    beforeEach(() => {
        cache = new EvictingCacheStorage({ maxSize: 3 });
    });

    it('should store and retrieve items', () => {
        cache.setItem('a', { data: 1, cachedAt: 1 });
        const result = cache.getItem('a');
        expect(result).to.deep.equal({ data: 1, cachedAt: 1 });
    });

    it('should return null for non-existent keys', () => {
        const result = cache.getItem('non-existent');
        expect(result).to.be.null;
    });

    it('should evict the least recently used item when maxSize is exceeded', () => {
        cache.setItem('a', { data: 1, cachedAt: 1 });
        cache.setItem('b', { data: 2, cachedAt: 1 });
        cache.setItem('c', { data: 3, cachedAt: 1 });
        cache.setItem('d', { data: 4, cachedAt: 1 }); // This should evict 'a'

        expect(cache.getItem('a')).to.be.null;
        expect(cache.getItem('b')).to.deep.equal({ data: 2, cachedAt: 1 });
        expect(cache.getItem('c')).to.deep.equal({ data: 3, cachedAt: 1 });
        expect(cache.getItem('d')).to.deep.equal({ data: 4, cachedAt: 1 });
    });

    it('should update the order of items when accessed', () => {
        cache.setItem('a', { data: 1, cachedAt: 1 });
        cache.setItem('b', { data: 2, cachedAt: 1 });
        cache.setItem('c', { data: 3, cachedAt: 1 });

        // Access 'a' to mark it as recently used
        cache.getItem('a');

        // Add a new item, evicting the least recently used ('b')
        cache.setItem('d', { data: 4, cachedAt: 1 });

        expect(cache.getItem('b')).to.be.null; // 'b' should be evicted
        expect(cache.getItem('a')).to.deep.equal({ data: 1, cachedAt: 1 }); // 'a' is still available
        expect(cache.getItem('c')).to.deep.equal({ data: 3, cachedAt: 1 });
        expect(cache.getItem('d')).to.deep.equal({ data: 4, cachedAt: 1 });
    });

    it('should overwrite an existing key and reorder it', () => {
        cache.setItem('a', { data: 1, cachedAt: 1 });
        cache.setItem('b', { data: 2, cachedAt: 1 });
        cache.setItem('c', { data: 3, cachedAt: 1 });

        cache.setItem('a', { data: 10, cachedAt: 1 }); // Overwrite 'a'

        // Add a new item, evicting the least recently used ('b')
        cache.setItem('d', { data: 4, cachedAt: 1 });

        expect(cache.getItem('b')).to.be.null; // 'b' should be evicted
        expect(cache.getItem('a')).to.deep.equal({ data: 10, cachedAt: 1 }); // Updated value
        expect(cache.getItem('c')).to.deep.equal({ data: 3, cachedAt: 1 });
        expect(cache.getItem('d')).to.deep.equal({ data: 4, cachedAt: 1 });
    });
});
