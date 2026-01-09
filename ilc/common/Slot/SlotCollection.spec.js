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
        expect(() => {
            slotCollection.isValid();
        }).to.throw;
    });

    it('should throw error with correct message when application not found', () => {
        const invalidSlots = {
            navbar: { appName: '@portal/nonexistent', props: {}, kind: null },
        };
        const slotCollection = new SlotCollection(invalidSlots, registry);
        expect(() => {
            slotCollection.isValid();
        }).to.throw(Error, 'Can not find application - @portal/nonexistent for slot - navbar');
    });

    it('should return true for empty slot collection', () => {
        const slotCollection = new SlotCollection({}, registry);
        expect(slotCollection.isValid()).to.be.true;
    });

    it('should throw error on first invalid slot when multiple slots are invalid', () => {
        const multipleInvalidSlots = {
            navbar: { appName: 'invalid1', props: {}, kind: null },
            body: { appName: 'invalid2', props: {}, kind: null },
        };
        const slotCollection = new SlotCollection(multipleInvalidSlots, registry);
        expect(() => {
            slotCollection.isValid();
        }).to.throw(Error);
    });

    it('should validate all slots when some are valid and some are invalid', () => {
        const mixedSlots = {
            navbar: { appName: '@portal/navbar', props: {}, kind: null },
            body: { appName: 'doesnotexist', props: {}, kind: null },
        };
        const slotCollection = new SlotCollection(mixedSlots, registry);
        expect(() => {
            slotCollection.isValid();
        }).to.throw(Error, 'Can not find application - doesnotexist for slot - body');
    });

    it('should include both slot name and app name in error message', () => {
        const invalidSlots = {
            customSlot: { appName: 'badapp', props: {}, kind: null },
        };
        const slotCollection = new SlotCollection(invalidSlots, registry);
        try {
            slotCollection.isValid();
            expect.fail('Should have thrown an error');
        } catch (error) {
            expect(error.message).to.include('customSlot');
            expect(error.message).to.include('badapp');
        }
    });
});
