import { expect } from 'chai';
import sinon from 'sinon';
import { SlotRenderObserver } from './SlotRenderObserver';

describe('SlotRenderObserver', () => {
    let slot, observer, onSlotReady;
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

    beforeEach(() => {
        slot = document.createElement('div');
        slot.id = 'slot-render-observer-host';
        document.body.appendChild(slot);
        onSlotReady = sinon.spy();
        observer = new SlotRenderObserver();
        observer.observe(slot, { onSlotReady });
    });

    afterEach(() => {
        observer.disconnect();
        slot.remove();
    });

    it('reports the slot ready when visible content with text appears', async () => {
        const content = document.createElement('div');
        content.innerHTML = '<p>hello</p>';
        slot.appendChild(content);
        await tick();

        sinon.assert.calledOnce(onSlotReady);
    });

    it('reports the slot ready when a node asks for it with data-ilc-slot-ready', async () => {
        const content = document.createElement('div');
        content.setAttribute('data-ilc-slot-ready', 'true');
        slot.appendChild(content);
        await tick();

        sinon.assert.calledOnce(onSlotReady);
    });

    it('does not count the content of a hidden container, such as a kept-alive app that left the route', async () => {
        const hidden = document.createElement('div');
        hidden.setAttribute('data-ilc-app-id', 'inbox__at__body');
        hidden.style.display = 'none';
        hidden.innerHTML = '<section><p>inbox: mounted, hidden</p></section>';
        slot.appendChild(hidden);

        const joining = document.createElement('div');
        joining.setAttribute('data-ilc-app-id', 'calendar__at__body');
        slot.appendChild(joining);
        await tick();

        sinon.assert.notCalled(onSlotReady);

        joining.innerHTML = '<section><p>calendar</p></section>';
        await tick();

        sinon.assert.calledOnce(onSlotReady);
    });

    it('throws when asked to observe twice', () => {
        expect(() => observer.observe(slot, { onSlotReady })).to.throw(/already observing/);
    });
});
