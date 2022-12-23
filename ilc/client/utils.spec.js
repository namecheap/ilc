import { expect } from 'chai';
import { prependSpaCallbacks } from './utils';

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
