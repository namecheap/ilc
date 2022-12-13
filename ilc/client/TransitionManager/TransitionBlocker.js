export default class TransitionBlocker {
    _promise;
    _onDestroyCallback;

    constructor(blockerExecutor) {
        if (blockerExecutor.then && blockerExecutor.catch) {
            this._promise = blockerExecutor;
        } else {
            this._promise = new Promise(blockerExecutor);
        }
    }

    promise() {
        return this._promise;
    }

    then(onFulfilled, onRejected) {
        this._promise.then(onFulfilled, onRejected);
        return this;
    }

    catch(onRejected) {
        this._promise.catch(onRejected);
        return this;
    }

    finally(onFulfilled, onRejected) {
        this.then(onFulfilled, onRejected);
        return this;
    }

    getId() {
        return this._promise;
    }

    onDestroy(callback) {
        this._onDestroyCallback = callback;
        return this;
    }

    destroy() {
        if (this._onDestroyCallback) {
            this._onDestroyCallback(this._externalId);
        }
    }
}
