const { Slot } = require('./Slot');
/**
 * @class SlotCollection
 */
class SlotCollection {
    /**
     * @property {Array<Slot>}
     */
    #slotCollection;

    /**
     * @constructor
     * @param {Object} slots
     * @param {Object} registryConfig
     */
    constructor(slots, { apps }) {
        this.#slotCollection = Object.keys(slots).map((key) => {
            return new Slot(
                {
                    ...slots[key],
                    slotName: key,
                },
                apps,
            );
        });
    }

    /**
     * @method isValid
     * @return {boolean}
     */
    isValid() {
        this.#slotCollection.forEach((slot) => {
            if (!slot.isValid()) {
                throw new Error(
                    `Can not find application - ${slot.getApplicationName()} for slot - ${slot.getSlotName()}`,
                );
            }
        });

        return true;
    }
}

module.exports = {
    SlotCollection,
};
