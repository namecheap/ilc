import { SlotTransitionTimeoutError } from './errors/SlotTransitionTimeoutError';

export class TransitionBlocker {
    _promise;
    _onDestroyCallback;
    _timeoutEnabled = false;
    _timeout = 3000;
    _timeoutId;
    _externalId = 'UnnamedTransitionBlocker';

    /**
     * Constructor for a TransitionBlocker instance.
     *
     * @param {Function} blockerExecutor - A function that performs the asynchronous task for the blocker.
     * @param {Function} blockerExecutionCancellation - A function that serves as a cancellation callback for the blocker execution.
     * @param {Object} [options] - Optional configuration options.
     * @param {number} [options.timeout] - The timeout duration in milliseconds for the blocker.
     * @param {string} [options.externalId] - An optional external identifier for the blocker.
     *
     * @throws {Error} Throws an error if `blockerExecutionCancellation` is not a function.
     *
     * @constructor
     */
    constructor(blockerExecutor, blockerExecutionCancellation, options) {
        this._timeoutEnabled = !!options?.timeout;
        this._timeout = options?.timeout || this._timeout;
        this._externalId = options?.externalId;

        if (typeof blockerExecutionCancellation !== 'function') {
            throw new Error(
                'TransitionBlocker blockerExecutionCancellation must be a function with cancellation callback',
            );
        }

        this._onDestroyCallback = blockerExecutionCancellation;

        const cancellablePromise = new Promise((resolve, reject) => {
            if (blockerExecutor && typeof blockerExecutor.then === 'function') {
                blockerExecutor.then(resolve, reject);
            } else if (typeof blockerExecutor === 'function') {
                blockerExecutor(resolve, reject);
            } else {
                throw new Error('TransitionBlocker blockerExecutor must be a function or a promise');
            }

            if (this._timeoutEnabled) {
                this._timeoutId = setTimeout(() => {
                    reject(
                        new SlotTransitionTimeoutError(
                            `TransitionBlocker timeout ${this._timeout}ms for blocker ${this.getId()}`,
                        ),
                    );
                }, this._timeout);
            }
        });

        // We have to guarantee clearing timeout in case promise is fulfilled or rejected
        this._promise = cancellablePromise.then(
            (result) => {
                this._clearTimeout();
                return result;
            },
            (error) => {
                this._clearTimeout();
                throw error;
            },
        );
    }

    _clearTimeout() {
        if (this._timeoutEnabled && this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }
    }

    then(onFulfilled, onRejected) {
        this._promise.then(onFulfilled, onRejected);
        return this;
    }

    catch(onRejected) {
        this._promise.catch(onRejected);
        return this;
    }

    getId() {
        return this._externalId;
    }

    destroy() {
        this._onDestroyCallback(this._externalId);
    }

    promise() {
        return this._promise;
    }
}
