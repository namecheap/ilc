import chai from 'chai';
import sinon from 'sinon';
import localStorage from './localStorage';
import CacheWrapper from './CacheWrapper';

describe('CacheWrapper', () => {
    let wrappedFn;

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
        cachedAt: now - cacheParams.cacheForSeconds - 60,
    };

    beforeEach(() => {
        const cacheWrapper = new CacheWrapper(localStorage, logger);
        wrappedFn = cacheWrapper.wrap(fn, { name: 'testCacheName' });
    });

    afterEach(() => {
        fn.reset();
        logger.error.reset();
        localStorage.clear();
    });

    it('should throw error if uses without "name"', async () => {
        const cacheWrapper = new CacheWrapper(localStorage, logger);
        chai.expect(() => cacheWrapper.wrap(fn, { name: undefined })).to.throw(
            'To wrap your function you should provide unique "name" to argument, to create hash-id of result of your function',
        );
    });

    it('should return a value', async () => {
        fn.withArgs().returns(Promise.resolve(data));

        const value = await wrappedFn();

        chai.expect(value)
            .to.include({
                data,
            })
            .and.to.have.all.keys('cachedAt');
    });

    it('should return values while it expects function`s parameters as a cached value`s key', async () => {
        fn.withArgs(...fnArgs)
            .onFirstCall()
            .returns(Promise.resolve(prevData))
            .onSecondCall()
            .returns(Promise.resolve(newData));

        const firstValue = await wrappedFn(...fnArgs);
        const secondValue = await wrappedFn(...fnArgs);

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

        const [firstValue, secondValue] = await Promise.all([wrappedFn(...firstFnArgs), wrappedFn(...secondFnArgs)]);

        chai.expect(firstValue).to.not.deep.equals(secondValue);
    });

    it('should return the same value in case of concurrent invocation', async () => {
        fn.withArgs().callsFake(() => new Promise((resolve) => setTimeout(() => resolve(data), 100)));

        const [firstValue, secondValue, thirdValue] = await Promise.all([wrappedFn(), wrappedFn(), wrappedFn()]);

        chai.expect(firstValue).to.deep.equal(secondValue).and.to.deep.equal(thirdValue);
        chai.expect(fn.calledOnce).to.be.true;
    });

    it('should return a stale value while it requests new data in the background', async () => {
        const cacheWrapper = new CacheWrapper(localStorage, logger, null, createHash);
        wrappedFn = cacheWrapper.wrap(fn, cacheParams);
        fn.withArgs(...fnArgs).returns(Promise.resolve(newData));
        createHash.withArgs(cacheParams.name + JSON.stringify(fnArgs)).returns(cachedValueKey);
        localStorage.setItem(cachedValueKey, JSON.stringify(prevCachedValue));

        const firstValue = await wrappedFn(...fnArgs);
        const secondValue = await wrappedFn(...fnArgs);

        chai.expect(firstValue).to.deep.equal(prevCachedValue).but.to.not.deep.equals(secondValue);
        chai.expect(fn.calledOnce).to.be.true;
    });

    it('should throw an error when requesting new data in the foreground because cache does not have any values', async () => {
        fn.withArgs().returns(Promise.reject(fnError));

        let rejectedError;

        try {
            await wrappedFn();
        } catch (error) {
            rejectedError = error;
        }

        chai.expect(rejectedError).to.equal(rejectedError);
    });

    describe('Multiple wrappers with same name', () => {
        let wrappedFirstFn;
        let wrappedSecondFn;
        let wrappedThrird;

        beforeEach(() => {
            const cacheWrapper = new CacheWrapper(localStorage, logger);

            wrappedFirstFn = cacheWrapper.wrap(fn, { name: 'testCacheName' });
            wrappedSecondFn = cacheWrapper.wrap(fn, { name: 'testCacheName' });
            wrappedThrird = cacheWrapper.wrap(fn, { name: 'testCacheName' });
        });

        it('should return the same value in case of concurrent invocation', async () => {
            fn.withArgs().callsFake(() => new Promise((resolve) => setTimeout(() => resolve(data), 100)));

            const [firstValue, secondValue, thirdValue] = await Promise.all([
                wrappedFirstFn(),
                wrappedSecondFn(),
                wrappedThrird(),
            ]);

            chai.expect(firstValue).to.deep.equal(secondValue).and.to.deep.equal(thirdValue);
            chai.expect(fn.calledOnce).to.be.true;
        });

        it('should return the same promise in case of concurrent invocation', async () => {
            const fnPromise = new Promise((resolve) => resolve(data));
            fn.withArgs().callsFake(() => fnPromise);

            const [firstValue, secondValue, thirdValue] = [wrappedFirstFn(), wrappedSecondFn(), wrappedThrird()];

            chai.expect(firstValue).to.deep.equal(secondValue).and.to.deep.equal(thirdValue);
            chai.expect(fn.calledOnce).to.be.true;
        });
    });

    describe('Correct cache date', () => {
        let clock;

        beforeEach(() => (clock = sinon.useFakeTimers()));

        afterEach(() => clock.restore());

        it('should set correct date now when saving new data to cache', async () => {
            const setItem = sinon.stub();

            const cacheWrapper = new CacheWrapper(
                {
                    setItem,
                    getItem: () => null,
                },
                logger,
            );

            wrappedFn = cacheWrapper.wrap(
                () => {
                    clock.tick(50000);
                    return Promise.resolve(data);
                },
                {
                    name: 'testCacheName',
                },
            );

            await wrappedFn();

            chai.expect(
                setItem.calledWith(
                    sinon.match.any,
                    JSON.stringify({
                        data: 'data',
                        cachedAt: 50,
                    }),
                ),
            ).to.be.true;
        });
    });

    describe('when requesting new data fails in the foreground but cache has a stale value', () => {
        beforeEach(() => {
            const cacheWrapper = new CacheWrapper(localStorage, logger, null, createHash);
            wrappedFn = cacheWrapper.wrap(fn, cacheParams);
            fn.withArgs(...fnArgs).returns(Promise.reject(fnError));
            localStorage.setItem(cachedValueKey, JSON.stringify(prevCachedValue));
            createHash.withArgs(JSON.stringify(fnArgs)).returns(cachedValueKey);
        });

        it('should return a stale cached value', async () => {
            await wrappedFn(...fnArgs);
            const secondValue = await wrappedFn(...fnArgs);

            chai.expect(secondValue).to.deep.equal(prevCachedValue);
            chai.expect(fn.calledOnce).to.be.true;
        });

        it('should log an error because a stale cached value was returned', async () => {
            await wrappedFn(...fnArgs);
            await wrappedFn(...fnArgs);

            chai.expect(logger.error.calledOnce).to.be.true;
            chai.expect(logger.error.getCall(0).args[0]).to.be.instanceof(Error);
            chai.expect(logger.error.getCall(0).args[0].message).to.eq('Error during cache update function execution');
            chai.expect(fn.calledOnce).to.be.true;
        });
    });
});
