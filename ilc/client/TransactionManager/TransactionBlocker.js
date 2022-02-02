
export default class TransactionBlocker {
    #externalId;
    #onDestroyFn;

    constructor(externalId) {
        this.#externalId = externalId;
    }

    getId() {
        return this.#externalId;
    }

    setDestroyFn(fn) {
        this.#onDestroyFn = fn;

        return this;
    }

    destroy() {
        if (this.#onDestroyFn) {
            this.#onDestroyFn(this.#externalId);
        }
    }
}
