import chai from 'chai';
import sinon from 'sinon';
import localStorage from './localStorage';
import wrapWithCache from './wrapWithCache';

describe('wrapWithCache', () => {
    let wrapedFn;

    const fn = sinon.stub();
    const createHash = sinon.stub();
    const logger = {
        error: sinon.stub(),
        info: function () {},
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
        name: 'testCacheName',
    };
    const prevCachedValue = {
        data: prevData,
        checkAfter: now,
        cachedAt: now - cacheParams.cacheForSeconds - 60,
    };

    beforeEach(() => {
        const wrapWithCacheStorage = wrapWithCache(localStorage, logger);
        wrapedFn = wrapWithCacheStorage(fn, { name: 'testCacheName' });
    });

    afterEach(() => {
        fn.reset();
        logger.error.reset();
        localStorage.clear();
    });

    it('should throw error if uses without "name"', async () => {
        const wrapWithCacheStorage = wrapWithCache(localStorage, logger);
        chai.expect(() => wrapWithCacheStorage(fn, { name: undefined })).to.throw(
            'To wrap your function you should provide unique "name" to argument, to create hash-id of result of your function',
        );
    });

    it('should return a value', async () => {
        fn.withArgs().returns(Promise.resolve(data));

        const value = await wrapedFn();

        chai.expect(value)
            .to.include({
                data,
            })
            .and.to.have.all.keys('checkAfter', 'cachedAt');
    });

    it('should return values while it expects function`s parameters as a cached value`s key', async () => {
        fn.withArgs(...fnArgs)
            .onFirstCall()
            .returns(Promise.resolve(prevData))
            .onSecondCall()
            .returns(Promise.resolve(newData));

        const firstValue = await wrapedFn(...fnArgs);
        const secondValue = await wrapedFn(...fnArgs);

        chai.expect(firstValue).to.deep.equals(secondValue);
        chai.expect(fn.calledOnce).to.be.true;
    });

    it('should return different values when different function`s parameters were provided', async () => {
        const firstData = 'firstData';
        const secondData = 'secondData';
        const firstFnArgs = ['firstArg'];
        const secondFnArgs = ['firstArg', 'secondArg'];

        fn.withArgs(...firstFnArgs).returns(Promise.resolve(firstData));
        fn.withArgs(...secondFnArgs).returns(Promise.resolve(secondData));

        const [firstValue, secondValue] = await Promise.all([wrapedFn(...firstFnArgs), wrapedFn(...secondFnArgs)]);

        chai.expect(firstValue).to.not.deep.equals(secondValue);
    });

    it('should return the same value in case of concurrent invocation', async () => {
        fn.withArgs().callsFake(() => new Promise((resolve) => setTimeout(() => resolve(data), 100)));

        const [firstValue, secondValue, thirdValue] = await Promise.all([wrapedFn(), wrapedFn(), wrapedFn()]);

        chai.expect(firstValue).to.deep.equal(secondValue).and.to.deep.equal(thirdValue);
        chai.expect(fn.calledOnce).to.be.true;
    });

    it('should return a stale value while it requests new data in the background', async () => {
        const wrapWithCacheStorage = wrapWithCache(localStorage, logger, createHash);
        wrapedFn = wrapWithCacheStorage(fn, cacheParams);
        fn.withArgs(...fnArgs).returns(Promise.resolve(newData));
        createHash.withArgs(cacheParams.name + JSON.stringify(fnArgs)).returns(cachedValueKey);
        localStorage.setItem(cachedValueKey, JSON.stringify(prevCachedValue));

        const firstValue = await wrapedFn(...fnArgs);
        const secondValue = await wrapedFn(...fnArgs);

        chai.expect(firstValue).to.deep.equal(prevCachedValue).but.to.not.deep.equals(secondValue);
        chai.expect(fn.calledOnce).to.be.true;
    });

    it('should throw an error when requesting new data in the foreground because cache does not have any values', async () => {
        fn.withArgs().returns(Promise.reject(fnError));

        let rejectedError;

        try {
            await wrapedFn();
        } catch (error) {
            rejectedError = error;
        }

        chai.expect(rejectedError).to.equal(rejectedError);
    });

    describe('when requesting new data fails in the foreground but cache has a stale value', () => {
        beforeEach(() => {
            const wrapWithCacheStorage = wrapWithCache(localStorage, logger, createHash);
            wrapedFn = wrapWithCacheStorage(fn, cacheParams);
            fn.withArgs(...fnArgs).returns(Promise.reject(fnError));
            localStorage.setItem(cachedValueKey, JSON.stringify(prevCachedValue));
            createHash.withArgs(JSON.stringify(fnArgs)).returns(cachedValueKey);
        });

        it('should return a stale cached value', async () => {
            await wrapedFn(...fnArgs);
            const secondValue = await wrapedFn(...fnArgs);

            chai.expect(secondValue).to.deep.equal(prevCachedValue);
            chai.expect(fn.calledOnce).to.be.true;
        });

        it('should log an error because a stale cached value was returned', async () => {
            await wrapedFn(...fnArgs);
            await wrapedFn(...fnArgs);

            chai.expect(logger.error.calledOnce).to.be.true;
            chai.expect(logger.error.getCall(0).args[0]).to.be.instanceof(Error);
            chai.expect(logger.error.getCall(0).args[0].message).to.eq('Error during cache update function execution');
            chai.expect(fn.calledOnce).to.be.true;
        });
    });
});
