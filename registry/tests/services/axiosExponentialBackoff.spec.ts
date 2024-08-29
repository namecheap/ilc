import { AxiosError } from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import { exponentialRetry } from '../../server/util/axiosExponentialRetry';

describe('exponentialRetry', () => {
    let clock: sinon.SinonFakeTimers;
    let fn: sinon.SinonStub;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
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

        const response = await exponentialRetry(fn);

        expect(response).to.equal('success');
        expect(fn.calledTwice).to.be.true;
    });

    it('should retry up to the maxAttempts and then throw the error', async () => {
        const error = new Error() as AxiosError;
        error.isAxiosError = true;
        error.response = { status: 500 } as any;
        fn.rejects(error);

        try {
            await exponentialRetry(fn, { maxAttempts: 3 });
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

        const baseDelay = 150;
        const promise = exponentialRetry(fn, { baseDelay });

        await clock.tickAsync(baseDelay); // Wait for the first delay (baseDelay)

        const response = await promise;

        expect(response).to.equal('success');
        expect(fn.calledTwice).to.be.true;
    });
});
