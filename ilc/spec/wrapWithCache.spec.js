import chai from 'chai';
import sinon from 'sinon';
import localStorage from 'localStorage';
import wrapWithCache from '../common/wrapWithCache';

describe('wrapWithCache', () => {
    let wrapedFn;
    let wrapWithCacheStorage;

    const fn = sinon.stub();
    const createHash = sinon.stub();
    const logger = {
        error: sinon.stub(),
    };

    const fnError = new Error('Error message');
    const fnArgs = ['firstArg', 'secondArg', 'thirdArg'];
    const cachedValueKey = 'cachedValueKey';
    const data = 'data';
    const prevData = 'prevData';
    const newData = 'newData';
    const now = Math.floor(Date.now() / 1000);
    const cacheParams = {
        cacheForSeconds: 3600,
    };
    const prevCachedValue = {
        data: prevData,
        checkAfter: now,
        cachedAt: now - cacheParams.cacheForSeconds - 60,
    };

    beforeEach(() => {
        wrapWithCacheStorage = wrapWithCache(localStorage, logger, createHash);
        createHash.withArgs(JSON.stringify(fnArgs)).returns(cachedValueKey);
    });

    afterEach(() => {
        fn.reset();
        logger.error.reset();
        localStorage.clear();
        createHash.reset();
    });

    describe('when a user calls a wrapped function the first time', () => {
        beforeEach(() => {
            wrapedFn = wrapWithCacheStorage(fn, cacheParams);
        });

        describe('without any params', () => {
            beforeEach(() => {
                fn.withArgs().onFirstCall().returns(Promise.resolve(data));
            });

            it('should return a cached value', async () => {
                const value = await wrapedFn();

                chai.expect(value).to.include({
                    data,
                }).and.to.have.all.keys('checkAfter', 'cachedAt');
            });
        });

        describe('with some params', () => {
            beforeEach(() => {
                fn.withArgs(...fnArgs).onFirstCall().returns(Promise.resolve(data));
            });

            it('should return a cached value', async () => {
                const value = await wrapedFn(...fnArgs);

                chai.expect(value).to.include({
                    data,
                }).and.to.have.all.keys('checkAfter', 'cachedAt');
            });
        });

        describe('but fetching a new data is rejected', () => {
            beforeEach(() => {
                fn.withArgs().onFirstCall().returns(Promise.reject(fnError));
            });

            it('should reject an err', async () => {
                let rejectedError;

                try {
                    await wrapedFn();
                } catch (error) {
                    rejectedError = error;
                }

                chai.expect(rejectedError).to.equal(rejectedError);
            });
        });
    });

    describe('when several users call a wrapped function the first time', () => {
        beforeEach(() => {
            fn.withArgs().onFirstCall().callsFake(() => new Promise((resolve) => setTimeout(() => resolve(data), 100)));
        });

        it('should return the same data for all users', async () => {
            const [firstValue, secondValue, thirdValue] = await Promise.all([
                wrapedFn(),
                wrapedFn(),
                wrapedFn(),
            ]);

            chai.expect(firstValue).to.deep.equal(secondValue).and.to.deep.equal(thirdValue);
        });
    });

    describe('when a user calls a wrapped function which a user called before', () => {
        describe('but the previous cached value is not expired', () => {
            beforeEach(() => {
                wrapedFn = wrapWithCacheStorage(fn, cacheParams);
                fn.withArgs(...fnArgs)
                    .onFirstCall().returns(Promise.resolve(prevData))
                    .onSecondCall().returns(Promise.resolve(newData));
            });

            it('should return the prev cached value', async () => {
                const firstValue = await wrapedFn(...fnArgs);
                const secondValue = await wrapedFn(...fnArgs);

                chai.expect(firstValue).to.deep.equals(secondValue);
            });
        });

        describe('but the previous cached value is expired', () => {
            beforeEach(() => {
                wrapedFn = wrapWithCacheStorage(fn, cacheParams);
                fn.withArgs(...fnArgs).onFirstCall().returns(Promise.resolve(newData));
                localStorage.setItem(cachedValueKey, JSON.stringify(prevCachedValue));
            });

            it('should return the prev cached value because it is better then wait for the result for a new data', async () => {
                const firstValue = await wrapedFn(...fnArgs);
                const secondValue = await wrapedFn(...fnArgs);

                chai.expect(firstValue).to.deep.equal(prevCachedValue).but.to.not.deep.equals(secondValue);
            });
        });

        describe('but fetching a new data is rejected', () => {
            beforeEach(() => {
                fn.withArgs(...fnArgs).onFirstCall().returns(Promise.reject(fnError));
                localStorage.setItem(cachedValueKey, JSON.stringify(prevCachedValue));
            });

            it('should return the previous cached value because throwing an error would cause unhandled promise rejection', async () => {
                await wrapedFn(...fnArgs);
                const secondValue = await wrapedFn(...fnArgs);

                chai.expect(secondValue).to.deep.equal(prevCachedValue);
            });

            it('should log an error', async () => {
                await wrapedFn(...fnArgs);
                await wrapedFn(...fnArgs);

                chai.expect(logger.error.calledWith(fnError)).to.be.true;
            });
        });
    });
});
