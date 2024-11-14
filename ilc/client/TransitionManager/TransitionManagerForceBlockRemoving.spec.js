import chai from 'chai';
import sinon from 'sinon';
import html from 'nanohtml';
import ilcEvents from '../constants/ilcEvents';

import { slotWillBe, TransitionManager } from './TransitionManager';
import { CssTrackedApp } from '../CssTrackedApp';

describe('TransitionManager Force Block removal', () => {
    const locationHash = 'i-am-location-hash';

    const logger = {
        warn: sinon.spy(),
    };

    const slots = {
        id: 'slots',
        appendSlots: () => document.body.appendChild(slots.ref),
        removeSlots: () => document.body.removeChild(slots.ref),
        resetRef: () => {
            slots.ref = html`
                <div id="${slots.id}">
                    <div id="${slots.navbar.id}"></div>
                    <div id="${slots.body.id}"></div>
                </div>
            `;
        },
        navbar: {
            id: 'navbar',
            getComputedStyle: () => window.getComputedStyle(slots.navbar.ref, null),
        },
        body: {
            id: 'body',
            getComputedStyle: () => window.getComputedStyle(slots.body.ref, null),
            getAttributeName: () => document.body.getAttribute('ilcTempStoredHash'),
        },
    };

    const applications = {
        navbar: {
            id: 'navbar-application',
            class: 'navbar-spa',
            appendApplication: () => slots.navbar.ref.appendChild(applications.navbar.ref),
            resetRef: () => {
                applications.navbar.ref = html`
                    <div id="${applications.navbar.id}" class="${applications.navbar.class}">
                        Hello! I am Navbar SPA
                    </div>
                `;
            },
        },
        body: {
            id: 'body-application',
            class: 'body-spa',
            appendApplication: () => slots.body.ref.appendChild(applications.body.ref),
            removeApplication: () => slots.body.ref.removeChild(applications.body.ref),
            resetRef: () => {
                applications.body.ref = html`
                    <div id="${applications.body.id}" class="${applications.body.class}">
                        <div data-ilc-slot-ready="true"></div>
                    </div>
                `;
            },
        },
    };

    const spinner = {
        id: 'ilc-spinner',
        class: 'ilc-spinner',
        getRef: () => document.getElementById(spinner.id),
    };

    let clock;
    let handlePageTransition;
    let removePageTransactionListeners;
    let handleError = sinon.spy();

    beforeEach(() => {
        window.location.hash = locationHash;

        const transitionManager = new TransitionManager(
            logger,
            {
                enabled: true,
                customHTML: `<div id="${spinner.id}" class="${spinner.class}">Hello! I am Spinner</div>`,
            },
            { handleError: handleError },
        );
        handlePageTransition = transitionManager.handlePageTransition.bind(transitionManager);
        removePageTransactionListeners = transitionManager.removeEventListeners.bind(transitionManager);

        slots.resetRef();
        applications.body.resetRef();
        applications.navbar.resetRef();

        slots.appendSlots();

        slots.navbar.ref = document.getElementById(slots.navbar.id);
        slots.body.ref = document.getElementById(slots.body.id);

        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        slots.removeSlots();
        clock.restore();
        removePageTransactionListeners();
        logger.warn.resetHistory();
    });

    it('should handle transition correctly if one slot does not have visible mutation but use force remove blocker attribute', async () => {
        handlePageTransition(slots.navbar.id, slotWillBe.rendered);

        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.not.null;
        chai.expect(slots.navbar.getComputedStyle().display).to.be.equal('none');
        chai.expect(slots.body.getAttributeName()).to.be.equal(locationHash);

        handlePageTransition(slots.body.id, slotWillBe.rendered);

        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.not.null;
        chai.expect(document.getElementsByClassName(spinner.class).length).to.equal(1);
        chai.expect(slots.navbar.getComputedStyle().display).to.be.equal('none');
        chai.expect(slots.body.getComputedStyle().display).to.be.equal('none');
        chai.expect(slots.body.getAttributeName()).to.be.equal(locationHash);

        applications.navbar.appendApplication();

        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.not.null;
        chai.expect(slots.navbar.getComputedStyle().display).to.be.equal('none');
        chai.expect(slots.body.getComputedStyle().display).to.be.equal('none');
        chai.expect(slots.body.getAttributeName()).to.be.equal(locationHash);

        applications.body.appendApplication();

        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.null;
        chai.expect(slots.navbar.getComputedStyle().display).to.be.equal('block');
        chai.expect(slots.body.getComputedStyle().display).to.be.equal('block');
    });
});
