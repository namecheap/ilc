import chai from 'chai';
import sinon from 'sinon';
import localStorage from 'localStorage';
import wrapWithCache from '../common/wrapWithCache';

describe('wrapWithCache', () => {
    let wrapedFn;

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
        const wrapWithCacheStorage = wrapWithCache(localStorage, logger, createHash);
        wrapedFn = wrapWithCacheStorage(fn, cacheParams);
        createHash.withArgs(JSON.stringify(fnArgs)).returns(cachedValueKey);
    });

    afterEach(() => {
        fn.reset();
        logger.error.reset();
        localStorage.clear();
        createHash.reset();
    });

    it('should return a value', async () => {
        fn.withArgs().returns(Promise.resolve(data));

        const value = await wrapedFn();

        chai.expect(value).to.include({
            data,
        }).and.to.have.all.keys('checkAfter', 'cachedAt');
    });

    it('should return the prev cached value while respecting function params as a key', async () => {
        fn.withArgs(...fnArgs)
            .onFirstCall().returns(Promise.resolve(prevData))
            .onSecondCall().returns(Promise.resolve(newData));

        const firstValue = await wrapedFn(...fnArgs);
        const secondValue = await wrapedFn(...fnArgs);

        chai.expect(firstValue).to.deep.equals(secondValue);
    });

    describe('when a user calls a wrapped function the first time', () => {
        describe('without any params', () => {
            it('should return a cached value', async () => {
                fn.withArgs().onFirstCall().returns(Promise.resolve(data));

                const value = await wrapedFn();

                chai.expect(value).to.include({
                    data,
                }).and.to.have.all.keys('checkAfter', 'cachedAt');
            });
        });

        describe('with some params', () => {
            it('should return a cached value', async () => {
                fn.withArgs(...fnArgs).onFirstCall().returns(Promise.resolve(data));

                const value = await wrapedFn(...fnArgs);

                chai.expect(value).to.include({
                    data,
                }).and.to.have.all.keys('checkAfter', 'cachedAt');
            });
        });

        describe('but fetching a new data is rejected', () => {
            it('should reject an err', async () => {
                fn.withArgs().onFirstCall().returns(Promise.reject(fnError));

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
        it('should return the same data for all users', async () => {
            fn.withArgs().onFirstCall().callsFake(() => new Promise((resolve) => setTimeout(() => resolve(data), 100)));

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
            it('should return the prev cached value', async () => {
                fn.withArgs(...fnArgs)
                    .onFirstCall().returns(Promise.resolve(prevData))
                    .onSecondCall().returns(Promise.resolve(newData));

                const firstValue = await wrapedFn(...fnArgs);
                const secondValue = await wrapedFn(...fnArgs);

                chai.expect(firstValue).to.deep.equals(secondValue);
            });
        });

        describe('but the previous cached value is expired', () => {
            it('should return the prev cached value because it is better then wait for the result for a new data', async () => {
                fn.withArgs(...fnArgs).onFirstCall().returns(Promise.resolve(newData));
                localStorage.setItem(cachedValueKey, JSON.stringify(prevCachedValue));

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
