import { AxiosError, AxiosHeaders } from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import { exponentialRetry } from './axiosExponentialRetry';

describe('exponentialRetry', () => {
    let clock: sinon.SinonFakeTimers;
    let fn: sinon.SinonStub;

    beforeEach(() => {
        clock = sinon.useFakeTimers({ shouldClearNativeTimers: true });
        fn = sinon.stub();
    });

    afterEach(() => {
        sinon.restore();
        clock.restore();
    });

    it('should return the result if the function succeeds on the first attempt', async () => {
        const result = 'success';
        fn.resolves(result);

        const response = await exponentialRetry(fn);

        expect(response).to.equal(result);
        expect(fn.calledOnce).to.be.true;
    });

    it('should retry on a retryable error and eventually succeed', async () => {
        const error = new Error() as AxiosError;
        error.isAxiosError = true;
        error.response = { status: 500 } as any;
        fn.onFirstCall().rejects(error);
        fn.onSecondCall().resolves('success');

        const promise = exponentialRetry(fn);

        await clock.runAllAsync();

        const response = await promise;

        expect(response).to.equal('success');
        expect(fn.calledTwice).to.be.true;
    });

    it('should retry up to the maxAttempts and then throw the error', async () => {
        const error = new Error() as AxiosError;
        error.isAxiosError = true;
        error.response = { status: 500 } as any;
        fn.rejects(error);

        try {
            const promise = exponentialRetry(fn, { maxAttempts: 3 });

            await clock.runAllAsync();

            await promise;
            expect.fail('Expected to throw an error');
        } catch (err) {
            expect(err).to.deep.equal(error);
        }

        expect(fn.callCount).to.equal(3);
    });

    it('should not retry on a non-retryable error', async () => {
        const error = new Error() as AxiosError;
        error.isAxiosError = true;
        error.response = { status: 400 } as any;
        fn.rejects(error);

        try {
            await exponentialRetry(fn);
            expect.fail('Expected to throw an error');
        } catch (err) {
            expect(err).to.deep.equal(error);
        }

        expect(fn.calledOnce).to.be.true;
    });

    it('should apply exponential backoff with jitter', async () => {
        const error = new Error() as AxiosError;
        error.isAxiosError = true;
        error.response = { status: 500 } as any;
        fn.onFirstCall().rejects(error);
        fn.onSecondCall().resolves('success');

        const promise = exponentialRetry(fn, { baseDelay: 150 });

        await clock.tickAsync(300); // Wait for the first MAX delay (baseDelay)

        const response = await promise;

        expect(response).to.equal('success');
        expect(fn.calledTwice).to.be.true;
    });

    for (const status of [429, 500, 503, 599]) {
        it(`should retry on status ${status}`, async () => {
            fn.onFirstCall().rejects(axiosErrorWithStatus(status));
            fn.onSecondCall().resolves('success');

            const promise = exponentialRetry(fn);
            await clock.runAllAsync();

            expect(await promise).to.equal('success');
            expect(fn.calledTwice).to.be.true;
        });
    }

    for (const status of [401, 404, 409, 600]) {
        it(`should not retry on status ${status}`, async () => {
            const error = axiosErrorWithStatus(status);
            fn.rejects(error);

            await expectRejection(exponentialRetry(fn), error);

            expect(fn.calledOnce).to.be.true;
        });
    }

    it('should retry on a network error without a response', async () => {
        fn.onFirstCall().rejects(new AxiosError('connect ECONNREFUSED', AxiosError.ERR_NETWORK));
        fn.onSecondCall().resolves('success');

        const promise = exponentialRetry(fn);
        await clock.runAllAsync();

        expect(await promise).to.equal('success');
        expect(fn.calledTwice).to.be.true;
    });

    it('should not retry on an error that is not from axios', async () => {
        const error = new Error('boom');
        fn.rejects(error);

        await expectRejection(exponentialRetry(fn), error);

        expect(fn.calledOnce).to.be.true;
    });

    it('should double the delay on each attempt', async () => {
        sinon.stub(Math, 'random').returns(1);
        fn.onFirstCall().rejects(axiosErrorWithStatus(500));
        fn.onSecondCall().rejects(axiosErrorWithStatus(500));
        fn.onThirdCall().resolves('success');

        const promise = exponentialRetry(fn, { baseDelay: 100 });

        await clock.tickAsync(199);
        expect(fn.callCount).to.equal(1);
        await clock.tickAsync(1);
        expect(fn.callCount).to.equal(2);

        await clock.tickAsync(399);
        expect(fn.callCount).to.equal(2);
        await clock.tickAsync(1);
        expect(fn.callCount).to.equal(3);

        expect(await promise).to.equal('success');
    });

    it('should cap the delay at maxDelay', async () => {
        sinon.stub(Math, 'random').returns(1);
        fn.onFirstCall().rejects(axiosErrorWithStatus(500));
        fn.onSecondCall().resolves('success');

        const promise = exponentialRetry(fn, { baseDelay: 1000, maxDelay: 50 });

        await clock.tickAsync(49);
        expect(fn.callCount).to.equal(1);
        await clock.tickAsync(1);
        expect(fn.callCount).to.equal(2);

        expect(await promise).to.equal('success');
    });
});

function axiosErrorWithStatus(status: number): AxiosError {
    return new AxiosError(`Request failed with status code ${status}`, undefined, undefined, undefined, {
        status,
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: null,
    });
}

async function expectRejection(promise: Promise<unknown>, error: Error): Promise<void> {
    try {
        await promise;
        expect.fail('Expected to throw an error');
    } catch (err) {
        expect(err).to.equal(error);
    }
}
