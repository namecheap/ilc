const { expect } = require('chai');
const { Slot } = require('./Slot');
const { slotsNotValid, slotsValid, registry } = require('./test/fixture');

describe('Slot', () => {
    it('should init valid slot', () => {
        const slot = new Slot(slotsValid[0], registry.apps);
        expect(slot.getApplicationName()).to.be.eq('@portal/navbar');
        expect(slot.isValid()).to.be.true;
    });

    it('should init not valid slot', () => {
        const slot = new Slot(slotsNotValid[1], registry.apps);
        expect(slot.getApplicationName()).to.be.eq('incorrect');
        expect(slot.isValid()).to.be.false;
    });
});
