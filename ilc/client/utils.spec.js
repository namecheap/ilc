import { expect } from 'chai';
import { prependSpaCallbacks, getAppContainer, placeAppContainer } from './utils';

describe('utils', () => {
    describe('prependSpaCallbacks', () => {
        const spaCallbacks = {
            bootstrap: () => {},
            mount: [() => {}],
            update: () => {},
            unmount: () => {},
            unload: () => {},
        };

        it('should dont make any changes to callback which are not changing', () => {
            const newMountCallback = () => {};
            const newUnmountCallback = () => {};

            const updatedSpaCallbacks = prependSpaCallbacks(spaCallbacks, [
                { type: 'mount', callback: newMountCallback },
                { type: 'unmount', callback: newUnmountCallback },
            ]);

            expect(updatedSpaCallbacks.bootstrap).to.eql(spaCallbacks.bootstrap);
            expect(updatedSpaCallbacks.update).to.eql(spaCallbacks.update);
            expect(updatedSpaCallbacks.unload).to.eql(spaCallbacks.unload);
        });

        it('should prepend new callback', () => {
            const newMountCallback = () => {};

            const updatedSpaCallbacks = prependSpaCallbacks(spaCallbacks, [
                { type: 'mount', callback: newMountCallback },
            ]);

            expect(updatedSpaCallbacks.mount)
                .to.be.an('array')
                .with.lengthOf(2)
                .eql([newMountCallback, ...spaCallbacks.mount]);
        });

        it('should convert function to array with this function and new one', () => {
            const newUnmountCallback = () => {};

            const updatedSpaCallbacks = prependSpaCallbacks(spaCallbacks, [
                { type: 'unmount', callback: newUnmountCallback },
            ]);

            expect(updatedSpaCallbacks.unmount)
                .to.be.an('array')
                .with.lengthOf(2)
                .eql([newUnmountCallback, spaCallbacks.unmount]);
        });
    });
});

describe('utils: getAppContainer', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    const addSlot = (innerHTML = '') => {
        const slot = document.createElement('div');
        slot.id = 'slot-getAppContainer';
        slot.innerHTML = innerHTML;
        document.body.appendChild(slot);
        return slot;
    };

    it('creates one container per app inside the slot, in call order, and reuses it', () => {
        const slot = addSlot();

        const core = getAppContainer('slot-getAppContainer', 'core__at__body');
        const inbox = getAppContainer('slot-getAppContainer', 'inbox__at__body');

        expect(getAppContainer('slot-getAppContainer', 'core__at__body')).to.equal(core);
        expect(slot.children[0]).to.equal(core);
        expect(slot.children[1]).to.equal(inbox);
        expect(slot.children.length).to.equal(2);
        expect(inbox.getAttribute('data-ilc-app-id')).to.equal('inbox__at__body');
    });

    it('keeps the list order of the route when apps mount in another order', () => {
        const slot = addSlot();
        const order = [
            'core__at__slot-getAppContainer',
            'inbox__at__slot-getAppContainer',
            'ads__at__slot-getAppContainer',
        ];

        const inbox = getAppContainer('slot-getAppContainer', order[1], order);
        const ads = getAppContainer('slot-getAppContainer', order[2], order);
        const core = getAppContainer('slot-getAppContainer', order[0], order);

        expect(Array.from(slot.children)).to.have.ordered.members([core, inbox, ads]);
    });

    it('moves a container back into its place when it is shown again', () => {
        const slot = addSlot();
        const order = ['core__at__slot-getAppContainer', 'inbox__at__slot-getAppContainer'];
        const inbox = getAppContainer('slot-getAppContainer', order[1], order);
        const core = getAppContainer('slot-getAppContainer', order[0], []); // unknown order: appended last

        expect(Array.from(slot.children)).to.have.ordered.members([inbox, core]);

        placeAppContainer(slot, core, order);

        expect(Array.from(slot.children)).to.have.ordered.members([core, inbox]);
    });

    it('returns the container the server rendered for the app', () => {
        addSlot('<div data-ilc-app-id="core__at__body"><p id="ssr">server markup</p></div>');

        const core = getAppContainer('slot-getAppContainer', 'core__at__body');

        expect(core.querySelector('#ssr')).to.exist;
        expect(document.getElementById('slot-getAppContainer').children.length).to.equal(1);
    });

    it('throws when the slot is not in the page', () => {
        expect(() => getAppContainer('missing', 'inbox__at__missing')).to.throw();
    });
});
