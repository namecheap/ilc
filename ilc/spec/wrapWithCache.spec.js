import chai from 'chai';
import sinon from 'sinon';
import wrapWithCache from '../common/wrapWithCache';

describe('wrapWithCache', () => {
    let wrapedFn;
    let wrapWithCacheStorage;

    const cacheStorage = new Map();
    const fn = sinon.stub();
    const createHash = sinon.stub();
    const logger = {
        error: sinon.stub(),
    };

    const fnError = new Error('Error message');

    before(() => {
        wrapWithCacheStorage = wrapWithCache(cacheStorage, logger, createHash);
    });

    afterEach(() => {
        fn.resetBehavior();
        createHash.resetBehavior();
        logger.error.resetBehavior();
        cacheStorage.clear();
    });

    describe('when cache storage is empty', () => {
        const data = 'data';
        const cacheParams = {
            cacheForSeconds: 60,
        };

        before(() => {
            wrapedFn = wrapWithCacheStorage(fn, cacheParams);
        });

        beforeEach(() => {
            fn.withArgs().returns(Promise.resolve(data));
        });

        it('should return a cached value when a user is calling a cached function', async () => {
            const cachedValue = await wrapedFn();

            chai.expect(cachedValue).to.own.include({
                data,
            }).and.to.have.all.keys('checkAfter', 'cachedAt');
        });

        it('should save a value into the cache', async () => {
            await wrapedFn();

            chai.expect(cacheStorage.size).to.equal(1);
        });

        describe('but fetching a data was rejected', () => {
            beforeEach(() => {
                fn.withArgs().returns(Promise.reject(fnError));
            });

            it('should not save any value into the cache', async () => {
                try {
                    await wrapedFn();
                } catch (error) { }

                chai.expect(cacheStorage.size).to.equal(0);
            });

            it('should reject an error when cashe storage does not have an old data', async () => {
                let catchedError;

                try {
                    await wrapedFn();
                } catch (error) {
                    catchedError = error;
                }

                chai.expect(catchedError).to.equal(fnError);
            });

            it('a logger should not notice any error', async () => {
                try {
                    await wrapedFn();
                } catch (error) { }

                chai.expect(logger.error.called).to.be.false;
            });
        });
    });

    describe('when cache storage has a value', () => {
        const now = Math.floor(Date.now() / 1000);
        const oldData = 'oldData';
        const cachedValueKey = 'cachedValueKey';
        const fnArgs = ['firstArg', 'secondArg', 'thirdArg'];

        beforeEach(() => {
            createHash.withArgs(JSON.stringify(fnArgs)).returns(cachedValueKey);
        });

        describe('but this value is expired', () => {
            const newData = 'newData';
            const cacheParams = {
                cacheForSeconds: 60,
            };
            const oldCachedValue = {
                data: oldData,
                checkAfter: now,
                cachedAt: now - 3600,
            };

            before(() => {
                wrapedFn = wrapWithCacheStorage(fn, cacheParams);
            });

            beforeEach(() => {
                fn.withArgs(...fnArgs).returns(Promise.resolve(newData));
                cacheStorage.set(cachedValueKey, oldCachedValue);
            });

            it('should return a previous cached value when a user is calling a cached function the first time after expiring data', async () => {
                const cachedValue = await wrapedFn(...fnArgs);

                chai.expect(cachedValue).to.equal(oldCachedValue);
            });

            it('should return a new cached value when a user is calling a cached function the the second time after expiring data', async () => {
                await wrapedFn(...fnArgs);
                const newCachedValue = await wrapedFn(...fnArgs);

                chai.expect(newCachedValue).to.own.include({
                    data: newData,
                }).and.to.have.all.keys('checkAfter', 'cachedAt');
            });

            describe('but fetching a new data was rejected when a user is calling a cached function the second time after expiring data', () => {
                beforeEach(() => {
                    fn.withArgs(...fnArgs).returns(Promise.reject(fnError));
                    cacheStorage.set(cachedValueKey, oldCachedValue);
                });

                it('should not be any errors because throwing an error would cause unhandled promise rejection', async () => {
                    await wrapedFn(...fnArgs);
                    const cachedValue = await wrapedFn(...fnArgs);

                    chai.expect(cachedValue).to.equal(oldCachedValue);
                });

                it('a logger should notice an error', async () => {
                    await wrapedFn(...fnArgs);
                    await wrapedFn(...fnArgs);

                    chai.expect(logger.error.called).to.be.true;
                });
            });
        });

        describe('and this value is actual', () => {
            const cacheParams = {
                cacheForSeconds: 3600,
            };
            const oldCachedValue = {
                data: oldData,
                checkAfter: now + cacheParams.cacheForSeconds,
                cachedAt: now,
            };

            beforeEach(() => {
                wrapedFn = wrapWithCacheStorage(fn, cacheParams);
                cacheStorage.set(cachedValueKey, oldCachedValue);
            });

            it('should return an old cached value when a user is calling a cached function', async () => {
                const cachedValue = await wrapedFn(...fnArgs);

                chai.expect(cachedValue).to.equal(oldCachedValue);
            });
        });
    });
});
