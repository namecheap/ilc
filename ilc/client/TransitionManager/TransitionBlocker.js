import { SlotTransitionTimeoutError } from './errors/SlotTransitionTimeoutError';

export class TransitionBlocker {
    #promise;
    #onDestroyCallback;
    #timeoutEnabled = false;
    #timeout = 3000;
    #timeoutId;
    #externalId = 'UnnamedTransitionBlocker';

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
        this.#timeoutEnabled = !!options?.timeout;
        this.#timeout = options?.timeout || this.#timeout;
        this.#externalId = options?.externalId;

        if (typeof blockerExecutionCancellation !== 'function') {
            throw new Error(
                'TransitionBlocker blockerExecutionCancellation must be a function with cancellation callback',
            );
        }

        this.#onDestroyCallback = blockerExecutionCancellation;

        const cancellablePromise = new Promise((resolve, reject) => {
            if (blockerExecutor && typeof blockerExecutor.then === 'function') {
                blockerExecutor.then(resolve, reject);
            } else if (typeof blockerExecutor === 'function') {
                blockerExecutor(resolve, reject);
            } else {
                throw new Error('TransitionBlocker blockerExecutor must be a function or a promise');
            }

            if (this.#timeoutEnabled) {
                this.#timeoutId = setTimeout(() => {
                    reject(
                        new SlotTransitionTimeoutError(
                            `TransitionBlocker timeout ${this.#timeout}ms for blocker ${this.getId()}`,
                        ),
                    );
                }, this.#timeout);
            }
        });

        // We have to guarantee clearing timeout in case promise is fulfilled or rejected
        this.#promise = cancellablePromise.then(
            (result) => {
                this.#clearTimeout();
                return result;
            },
            (error) => {
                this.#clearTimeout();
                throw error;
            },
        );
    }

    #clearTimeout() {
        if (this.#timeoutEnabled && this.#timeoutId) {
            clearTimeout(this.#timeoutId);
            this.#timeoutId = null;
        }
    }

    then(onFulfilled, onRejected) {
        this.#promise.then(onFulfilled, onRejected);
        return this;
    }

    catch(onRejected) {
        this.#promise.catch(onRejected);
        return this;
    }

    getId() {
        return this.#externalId;
    }

    destroy() {
        this.#onDestroyCallback(this._externalId);
    }

    promise() {
        return this.#promise;
    }
}
