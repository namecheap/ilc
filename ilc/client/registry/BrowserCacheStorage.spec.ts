import { expect } from 'chai';
import sinon from 'sinon';
import { BrowserCacheStorage } from './BrowserCacheStorage';

describe('BrowserCacheStorage', () => {
    let cacheStorage: BrowserCacheStorage;
    let mockLocalStorage: Storage;

    const sandbox = sinon.createSandbox();

    beforeEach(() => {
        // Mock the localStorage API
        mockLocalStorage = {
            getItem: sandbox.stub(),
            setItem: sandbox.stub(),
            removeItem: sandbox.stub(),
            clear: sandbox.stub(),
        } as unknown as Storage;

        cacheStorage = new BrowserCacheStorage(mockLocalStorage);
    });

    afterEach(() => {
        // Restore the default sandbox here
        sandbox.restore();
    });

    describe('getItem', () => {
        it('should return parsed data from localStorage if key exists', () => {
            const key = 'testKey';
            const value = { data: 'testData' };

            // Mock localStorage.getItem to return stringified data
            (mockLocalStorage.getItem as sinon.SinonStub).withArgs(key).returns(JSON.stringify(value));

            const result = cacheStorage.getItem<typeof value>(key);

            sandbox.assert.calledWith(mockLocalStorage.getItem as sinon.SinonStub, key);
            expect(result).to.deep.equal(value);
        });

        it('should return null if key does not exist in localStorage', () => {
            const key = 'missingKey';

            // Mock localStorage.getItem to return null
            (mockLocalStorage.getItem as sinon.SinonStub).withArgs(key).returns(null);

            const result = cacheStorage.getItem(key);

            sandbox.assert.calledWith(mockLocalStorage.getItem as sinon.SinonStub, key);
            expect(result).to.be.null;
        });
    });

    describe('setItem', () => {
        it('should store stringified data in localStorage', () => {
            const key = 'testKey';
            const value = { data: 'testData', cachedAt: Date.now() };

            cacheStorage.setItem(key, value);

            sandbox.assert.calledWith(mockLocalStorage.setItem as sinon.SinonStub, key, JSON.stringify(value));
        });
    });
});
