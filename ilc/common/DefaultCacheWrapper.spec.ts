import { type ExtendedError } from '@namecheap/error-extender';
import chai from 'chai';
import { type Logger } from 'ilc-plugins-sdk';
import sinon from 'sinon';
import { DefaultCacheWrapper } from './DefaultCacheWrapper';
import { CacheParams, CacheResult, CacheStorage } from './types/CacheWrapper';
import { TimeoutError } from './utils';

/**
 * timers/promises and setImmediate doesn't work in karma test
 */
async function setImmediatePromise() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('DefaultCacheWrapper', () => {
    let wrappedFn: (...args: any[]) => Promise<CacheResult<unknown>>;
    let clock: sinon.SinonFakeTimers;
    let storageMock: CacheStorage;

    const fn = sinon.stub();
    const createHash = sinon.stub();
    const loggerMock = {
        error: sinon.stub(),
        info: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<Logger>;

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
        const storageMockCache: Record<string, CacheResult<any>> = {};
        storageMock = {
            getItem: (key) => storageMockCache[key] ?? null,
            setItem: (key, cache) => (storageMockCache[key] = cache),
        };
        const cacheWrapper = new DefaultCacheWrapper(storageMock, loggerMock, null);
        wrappedFn = cacheWrapper.wrap(fn, { name: 'testCacheName' });
    });

    afterEach(() => {
        fn.reset();
        loggerMock.error.reset();
        clock?.restore();
    });

    it('should throw error if uses without "name"', async () => {
        const cacheWrapper = new DefaultCacheWrapper(storageMock, loggerMock, null);
        chai.expect(() => cacheWrapper.wrap(fn, { name: undefined } as unknown as CacheParams)).to.throw(
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
        const cacheWrapper = new DefaultCacheWrapper(storageMock, loggerMock, null, createHash);
        wrappedFn = cacheWrapper.wrap(fn, cacheParams);
        fn.withArgs(...fnArgs).returns(Promise.resolve(newData));
        createHash
            .withArgs(cacheParams.name + cacheParams.cacheForSeconds + JSON.stringify(fnArgs))
            .returns(cachedValueKey);
        storageMock.setItem(cachedValueKey, prevCachedValue);

        const firstValue = await wrappedFn(...fnArgs);
        await setImmediatePromise(); // Promise.race() in implemantion blocks cache update in same event loop tick so need to run additional tick in test
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

    it('should handle long execution of requesting new data', async () => {
        clock = sinon.useFakeTimers();
        fn.withArgs()
            .onFirstCall()
            .resolves(data)
            .onSecondCall()
            .returns(new Promise(() => {}))
            .onThirdCall()
            .resolves(newData);

        // init cache entry
        const firstValue = await wrappedFn();
        chai.expect(firstValue).to.deep.equal({ cachedAt: 0, data });
        chai.expect(fn.calledOnce).to.be.true;

        // cache expired
        await clock.tickAsync(cacheParams.cacheForSeconds * 1000);
        const secondValue = await wrappedFn();
        chai.expect(fn.calledTwice).to.be.true;
        chai.expect(secondValue).to.deep.equal({ cachedAt: 0, data });
        chai.expect(loggerMock.error.called).to.be.false;

        // timeout exceed
        await clock.tickAsync(cacheParams.cacheForSeconds * 1000);
        chai.expect(loggerMock.error.calledOnce).to.be.true;
        chai.expect((loggerMock.error.getCall(0).args[0] as ExtendedError).cause).to.be.instanceof(TimeoutError);
        chai.expect((loggerMock.error.getCall(0).args[0] as ExtendedError).message).to.eq(
            'Error during cache update function execution',
        );
        chai.expect((loggerMock.error.getCall(0).args[0] as ExtendedError).cause.message).to.eq(
            'Cache testCacheName update timeout 60s',
        );

        // update cache after error
        const thirdValue = await wrappedFn(); // this request will still return stale value since we do not wait for promises after 1st execution
        await clock.runAllAsync(); // let Promise.race() finish
        chai.expect(fn.calledThrice).to.be.true;
        chai.expect(thirdValue).to.deep.equal({ cachedAt: 0, data });

        const fourthValue = await wrappedFn();
        chai.expect(fn.calledThrice).to.be.true;
        chai.expect(fourthValue).to.deep.equal({ cachedAt: 7200, data: newData });
        chai.expect(loggerMock.error.calledOnce).to.be.true;
    });

    describe('Multiple wrappers', () => {
        let wrappedFirstFn: () => {};
        let wrappedSecondFn: () => {};
        let wrappedThirdFn: () => {};

        describe('with same name and cacheForSeconds', () => {
            beforeEach(() => {
                const cacheWrapper = new DefaultCacheWrapper(storageMock, loggerMock, null);

                wrappedFirstFn = cacheWrapper.wrap(fn, { name: 'testCacheName' });
                wrappedSecondFn = cacheWrapper.wrap(fn, { name: 'testCacheName' });
                wrappedThirdFn = cacheWrapper.wrap(fn, { name: 'testCacheName' });
            });

            it('should return the same value in case of concurrent invocation', async () => {
                fn.withArgs().callsFake(() => new Promise((resolve) => setTimeout(() => resolve(data), 100)));

                const [firstValue, secondValue, thirdValue] = await Promise.all([
                    wrappedFirstFn(),
                    wrappedSecondFn(),
                    wrappedThirdFn(),
                ]);

                chai.expect(firstValue).to.deep.equal(secondValue).and.to.deep.equal(thirdValue);
                chai.expect(fn.calledOnce).to.be.true;
            });

            it('should return the same promise in case of concurrent invocation', async () => {
                const fnPromise = new Promise((resolve) => resolve(data));
                fn.withArgs().callsFake(() => fnPromise);

                const [firstValue, secondValue, thirdValue] = [wrappedFirstFn(), wrappedSecondFn(), wrappedThirdFn()];

                chai.expect(firstValue).to.deep.equal(secondValue).and.to.deep.equal(thirdValue);
                chai.expect(fn.calledOnce).to.be.true;
            });
        });

        describe('with same name and cacheForSeconds', () => {
            let fn: sinon.SinonStub;

            beforeEach(() => {
                fn = sinon.stub();

                const cacheWrapper = new DefaultCacheWrapper(storageMock, loggerMock, null);

                wrappedFirstFn = cacheWrapper.wrap(fn, { name: 'testCacheName', cacheForSeconds: 100 });
                wrappedSecondFn = cacheWrapper.wrap(fn, { name: 'testCacheName', cacheForSeconds: 200 });
                wrappedThirdFn = cacheWrapper.wrap(fn, { name: 'testCacheName', cacheForSeconds: 300 });
            });

            it('should return the different promise in case of concurrent invocation', async () => {
                const fnPromise = new Promise((resolve) => resolve(data));
                fn.withArgs().callsFake(() => fnPromise);

                const [firstValue, secondValue, thirdValue] = [wrappedFirstFn(), wrappedSecondFn(), wrappedThirdFn()];

                chai.expect(firstValue).not.to.deep.equal(secondValue).and.not.to.deep.equal(thirdValue);
                chai.expect(fn.calledThrice).to.be.true;
            });
        });
    });

    describe('Correct cache date', () => {
        let clock: sinon.SinonFakeTimers;

        beforeEach(() => (clock = sinon.useFakeTimers()));

        afterEach(() => clock.restore());

        it('should set correct date now when saving new data to cache', async () => {
            const setItem = sinon.stub();

            const cacheWrapper = new DefaultCacheWrapper(
                {
                    setItem,
                    getItem: () => null,
                },
                loggerMock,
                null,
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
            sinon.assert.calledWith(setItem, sinon.match.any, {
                data: 'data',
                cachedAt: 50,
            });
        });
    });

    describe('when requesting new data fails in the foreground but cache has a stale value', () => {
        beforeEach(() => {
            const cacheWrapper = new DefaultCacheWrapper(storageMock, loggerMock, undefined, createHash);
            wrappedFn = cacheWrapper.wrap(fn, cacheParams);
            fn.withArgs(...fnArgs).returns(Promise.reject(fnError));
            storageMock.setItem(cachedValueKey, prevCachedValue);
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
            await setImmediatePromise(); // Promise.race blocks promise resolving is same event loop tick, need to switch it manually

            chai.expect(loggerMock.error.calledOnce).to.be.true;
            chai.expect(loggerMock.error.getCall(0).args[0]).to.be.instanceof(Error);
            chai.expect((loggerMock.error.getCall(0).args[0] as ExtendedError).message).to.eq(
                'Error during cache update function execution',
            );
            chai.expect(fn.calledOnce).to.be.true;
        });
    });
});
