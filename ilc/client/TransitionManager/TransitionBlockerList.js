export default class TransitionBlockerList {

    /** @type TransitionBlocker[] */
    #items = [];
    #spaTransitionReady = false;

    init() {
        this.#spaTransitionReady = true;
    }

    isReady() {
        return this.#spaTransitionReady;
    }

    isEmpty() {
        return this.size() === 0;
    }

    add(item) {
        this.#items.push(item);
    }

    remove(item) {
        const itemId = item.getId();

        const itemIndex = this.#items.findIndex(v => v.getId() === itemId);
        if (itemIndex === -1) {
            return;
        }

        this.#items.splice(itemIndex, 1);
    }

    findById(itemId) {
        return this.#items.find(item => item.getId() === itemId);
    }

    find(item) {
        return this.#items.find(existingItem => existingItem === item);
    }

    size() {
        return this.#items.length;
    }

    promises() {
        return this.#items.map(items => items.promise());
    }
}
