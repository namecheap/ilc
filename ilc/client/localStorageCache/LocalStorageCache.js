export default class LocalStorageCache {
    #localStorage;

    constructor(localStorage) {
        this.#localStorage = localStorage;
    }

    set(key, value) {
        this.#localStorage.setItem(key, JSON.stringify(value));
    }

    get(key) {
        if (!this.has(key)) {
            return;
        }

        const value = this.#localStorage.getItem(key);
        return JSON.parse(value);
    }

    has(key) {
        return this.#localStorage.getItem(key) !== null;
    }
}
