const { expect } = require('chai');
const { SlotCollection } = require('./SlotCollection');
const { slotRawValid, slotRawNotValid, registry } = require('./test/fixture');

describe('SlotCollection', () => {
    it('should init valid slot collection', () => {
        const slotCollection = new SlotCollection(slotRawValid, registry);
        expect(slotCollection.isValid()).to.be.true;
    });

    it('should init not valid slot collection', () => {
        const slotCollection = new SlotCollection(slotRawNotValid, registry);
        expect(() => {slotCollection.isValid()}).to.throw;
    });

});
