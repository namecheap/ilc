/**
 * @class Slot
 */
class Slot {

    #rawSlot;
    #rawApps;

    /**
     * @constructor
     * @params {RawSlot} rawSlot
     * @params {RawApps} registry config
     */
    constructor(rawSlot, apps) {
        this.#rawSlot = rawSlot;
        this.#rawApps = apps;
    }

    /**
     * @method
     * @description Return if slot is valid
     * @return {boolean}
     */
    isValid() {
        return !!this.#rawApps[this.#rawSlot.appName];
    }
    /**
     * @method
     * @description Return application's name
     * @return {string}
     */
    getApplicationName() {
        return this.#rawSlot.appName;
    }

}

module.exports = {
    Slot,
}
