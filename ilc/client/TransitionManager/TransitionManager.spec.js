import * as chai from 'chai';
import sinon from 'sinon';
import html from 'nanohtml';
import ilcEvents from '../constants/ilcEvents';

import { slotWillBe, TransitionManager } from './TransitionManager';
import { CssTrackedApp } from '../CssTrackedApp';

describe('TransitionManager', () => {
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
                    <div id="${slots.clientless.id}"></div>
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
        clientless: {
            id: 'clientless',
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
                    <div id="${applications.body.id}" class="${applications.body.class}">Hello! I am Body SPA</div>
                `;
            },
        },
        clientless: {
            id: 'clientless-application',
            class: 'clientless-spa',
            appendApplication: () => {},
            removeApplication: () => {},
            resetRef: () => {},
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

    beforeEach(() => {
        window.location.hash = locationHash;

        const transitionManager = new TransitionManager(
            logger,
            {
                enabled: true,
                customHTML: `<div id="${spinner.id}" class="${spinner.class}">Hello! I am Spinner</div>`,
            },
            { handleError: () => {} },
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

    it('should throw an error when a slot name is not provided', () => {
        chai.expect(() => handlePageTransition()).to.throw('A slot name was not provided!');
    });

    it('should log warning when a non-existing slot name is provided', () => {
        const slotName = 'invalid-slot-name';
        const willBe = slotWillBe.rendered;
        handlePageTransition(slotName, willBe);

        sinon.assert.calledWithExactly(
            logger.warn,
            `Failed to correctly handle page transition "${willBe}" for slot "${slotName}" due to it's absence in template. Ignoring it...`,
        );
    });

    it('should not log warning when a non-existing slot name is provided but the action is default', () => {
        const slotName = 'invalid-slot-name';
        const willBe = slotWillBe.default;
        handlePageTransition(slotName, willBe);

        sinon.assert.notCalled(logger.warn);
    });

    it('should throw an error when a slot action does not match any possible option to handle', () => {
        chai.expect(() => handlePageTransition(slots.body.id, 'undefined')).to.throw(
            `The slot action 'undefined' did not match any possible values!`,
        );
    });

    it('should do nothing when a slot action is default', async () => {
        handlePageTransition(slots.body.id, slotWillBe.default);

        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.null;
        chai.expect(slots.ref.innerHTML).to.be.equal(
            `<div id="${slots.navbar.id}"></div>` +
                `<div id="${slots.body.id}"></div>` +
                `<div id="${slots.clientless.id}"></div>`,
        );

        applications.body.appendApplication();

        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.null;
        chai.expect(slots.ref.innerHTML).to.be.equal(
            `<div id="${slots.navbar.id}"></div>` +
                `<div id="${slots.body.id}">` +
                `<div id="${applications.body.id}" class="${applications.body.class}">` +
                'Hello! I am Body SPA' +
                '</div>' +
                '</div>' +
                `<div id="${slots.clientless.id}"></div>`,
        );

        applications.body.removeApplication();

        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.null;
        chai.expect(slots.ref.innerHTML).to.be.equal(
            `<div id="${slots.navbar.id}"></div>` + `<div id="${slots.body.id}"></div>` + `<div id="clientless"></div>`,
        );
    });

    it('should listen to slot content changes when a slot is going to be rendered', async () => {
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
        chai.expect(slots.body.getAttributeName()).to.be.null;
    });

    it('should listen to slot content changes when a slot is going to be rendered with clientless slot', async () => {
        handlePageTransition(slots.navbar.id, slotWillBe.rendered);

        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.not.null;
        chai.expect(slots.navbar.getComputedStyle().display).to.be.equal('none');
        chai.expect(slots.body.getAttributeName()).to.be.equal(locationHash);

        handlePageTransition(slots.clientless.id, slotWillBe.default);

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
        chai.expect(slots.body.getAttributeName()).to.be.null;
    });

    it('should listen to slot content changes when a slot is going to be rendered', async () => {
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
        chai.expect(slots.body.getAttributeName()).to.be.null;
    });

    it('should render a fake slot when a slot is going to be removed', async () => {
        applications.navbar.appendApplication();
        applications.body.appendApplication();

        handlePageTransition(slots.body.id, slotWillBe.removed);

        await clock.runAllAsync();

        applications.body.removeApplication();

        await clock.runAllAsync();

        const bodyApplications = document.getElementsByClassName(applications.body.class);
        chai.expect(bodyApplications.length).to.be.equal(1);

        const [fakeBodyApplicationRef] = bodyApplications;
        const fakeBodySlot = fakeBodyApplicationRef.parentNode;

        chai.expect(fakeBodyApplicationRef.id).to.be.equal(applications.body.id);

        chai.expect(window.getComputedStyle(fakeBodyApplicationRef, null).display).to.be.equal('block');
        chai.expect(window.getComputedStyle(fakeBodySlot, null).display).to.be.equal('block');
        chai.expect(slots.body.getComputedStyle().display).to.be.equal('none');
        chai.expect(slots.navbar.getComputedStyle().display).to.be.equal('block');

        chai.expect(fakeBodySlot.nodeName).to.be.equal(slots.body.ref.nodeName);
        chai.expect(fakeBodySlot.id).to.be.equal('');
        chai.expect(fakeBodySlot.className).to.be.equal('');

        chai.expect(spinner.getRef()).to.be.null;
    });

    // can be case when rendering is triggered before removing and vise versa, but the result should be always the same
    describe('should render a fake slot and listen to slot content changes', () => {
        it('when a slot is going to be rerendered', async () => {
            const newBodyApplication = {
                id: 'new-body-application',
                class: 'new-body-spa',
            };

            newBodyApplication.ref = html`
                <div id="${newBodyApplication.id}" class="${newBodyApplication.class}">Hello! I am new Body SPA</div>
            `;

            applications.navbar.appendApplication();
            applications.body.appendApplication();

            handlePageTransition(slots.body.id, slotWillBe.rerendered);

            await clock.runAllAsync();

            applications.body.removeApplication();

            await clock.runAllAsync();

            const bodyApplications = document.getElementsByClassName(applications.body.class);
            chai.expect(bodyApplications.length).to.be.equal(1);

            const [fakeBodyApplicationRef] = bodyApplications;
            const fakeBodySlot = fakeBodyApplicationRef.parentNode;

            chai.expect(fakeBodyApplicationRef.id).to.be.equal(applications.body.id);

            chai.expect(window.getComputedStyle(fakeBodyApplicationRef, null).display).to.be.equal('block');
            chai.expect(slots.navbar.getComputedStyle().display).to.be.equal('block');
            chai.expect(slots.body.getComputedStyle().display).to.be.equal('none');
            chai.expect(window.getComputedStyle(fakeBodySlot, null).display).to.be.equal('block');

            chai.expect(fakeBodySlot.nodeName).to.be.equal(slots.body.ref.nodeName);
            chai.expect(fakeBodySlot.id).to.be.equal('');
            chai.expect(fakeBodySlot.className).to.be.equal('');

            chai.expect(spinner.getRef()).to.be.not.null;
            chai.expect(slots.body.getAttributeName()).to.be.equal(locationHash);

            slots.body.ref.appendChild(newBodyApplication.ref);

            await clock.runAllAsync();

            chai.expect(spinner.getRef()).to.be.null;
            chai.expect(slots.navbar.getComputedStyle().display).to.be.equal('block');
            chai.expect(slots.body.getComputedStyle().display).to.be.equal('block');
            chai.expect(slots.body.getAttributeName()).to.be.null;
        });

        // default behaviour, now it equals to "rerendered", but it's good to have test
        it('when a slot is going to be removed and then rendered', async () => {
            const newBodyApplication = {
                id: 'new-body-application',
                class: 'new-body-spa',
            };

            newBodyApplication.ref = html`
                <div id="${newBodyApplication.id}" class="${newBodyApplication.class}">Hello! I am new Body SPA</div>
            `;

            applications.navbar.appendApplication();
            applications.body.appendApplication();

            handlePageTransition(slots.body.id, slotWillBe.removed);
            handlePageTransition(slots.body.id, slotWillBe.rendered);

            await clock.runAllAsync();

            applications.body.removeApplication();

            await clock.runAllAsync();

            const bodyApplications = document.getElementsByClassName(applications.body.class);
            chai.expect(bodyApplications.length).to.be.equal(1);

            const [fakeBodyApplicationRef] = bodyApplications;
            const fakeBodySlot = fakeBodyApplicationRef.parentNode;

            chai.expect(fakeBodyApplicationRef.id).to.be.equal(applications.body.id);

            chai.expect(window.getComputedStyle(fakeBodyApplicationRef, null).display).to.be.equal('block');
            chai.expect(slots.navbar.getComputedStyle().display).to.be.equal('block');
            chai.expect(slots.body.getComputedStyle().display).to.be.equal('none');
            chai.expect(window.getComputedStyle(fakeBodySlot, null).display).to.be.equal('block');

            chai.expect(fakeBodySlot.nodeName).to.be.equal(slots.body.ref.nodeName);
            chai.expect(fakeBodySlot.id).to.be.equal('');
            chai.expect(fakeBodySlot.className).to.be.equal('');

            chai.expect(spinner.getRef()).to.be.not.null;
            chai.expect(slots.body.getAttributeName()).to.be.equal(locationHash);

            slots.body.ref.appendChild(newBodyApplication.ref);

            await clock.runAllAsync();

            chai.expect(spinner.getRef()).to.be.null;
            chai.expect(slots.navbar.getComputedStyle().display).to.be.equal('block');
            chai.expect(slots.body.getComputedStyle().display).to.be.equal('block');
            chai.expect(slots.body.getAttributeName()).to.be.null;
        });

        it('when a slot is going to be rendered and then removed', async () => {
            const newBodyApplication = {
                id: 'new-body-application',
                class: 'new-body-spa',
            };

            newBodyApplication.ref = html`
                <div id="${newBodyApplication.id}" class="${newBodyApplication.class}">Hello! I am new Body SPA</div>
            `;

            applications.navbar.appendApplication();
            applications.body.appendApplication();

            handlePageTransition(slots.body.id, slotWillBe.rendered);
            handlePageTransition(slots.body.id, slotWillBe.removed);

            await clock.runAllAsync();

            applications.body.removeApplication();

            await clock.runAllAsync();

            const bodyApplications = document.getElementsByClassName(applications.body.class);
            chai.expect(bodyApplications.length).to.be.equal(1);

            const [fakeBodyApplicationRef] = bodyApplications;
            const fakeBodySlot = fakeBodyApplicationRef.parentNode;

            chai.expect(fakeBodyApplicationRef.id).to.be.equal(applications.body.id);

            chai.expect(window.getComputedStyle(fakeBodyApplicationRef, null).display).to.be.equal('block');
            chai.expect(slots.navbar.getComputedStyle().display).to.be.equal('block');
            chai.expect(slots.body.getComputedStyle().display).to.be.equal('none');
            chai.expect(window.getComputedStyle(fakeBodySlot, null).display).to.be.equal('block');

            chai.expect(fakeBodySlot.nodeName).to.be.equal(slots.body.ref.nodeName);
            chai.expect(fakeBodySlot.id).to.be.equal('');
            chai.expect(fakeBodySlot.className).to.be.equal('');

            chai.expect(spinner.getRef()).to.be.not.null;
            chai.expect(slots.body.getAttributeName()).to.be.equal(locationHash);

            slots.body.ref.appendChild(newBodyApplication.ref);

            await clock.runAllAsync();

            chai.expect(spinner.getRef()).to.be.null;
            chai.expect(slots.navbar.getComputedStyle().display).to.be.equal('block');
            chai.expect(slots.body.getComputedStyle().display).to.be.equal('block');
            chai.expect(slots.body.getAttributeName()).to.be.null;
        });

        it('should correctly handle duplicative calls when a slot is going to be rendered and then removed', async () => {
            const newBodyApplication = {
                id: 'new-body-application',
                class: 'new-body-spa',
            };

            newBodyApplication.ref = html`
                <div id="${newBodyApplication.id}" class="${newBodyApplication.class}">Hello! I am new Body SPA</div>
            `;

            applications.body.appendApplication();

            handlePageTransition(slots.body.id, slotWillBe.rendered);
            handlePageTransition(slots.body.id, slotWillBe.rendered);
            handlePageTransition(slots.body.id, slotWillBe.removed);
            handlePageTransition(slots.body.id, slotWillBe.removed);

            await clock.runAllAsync();

            applications.body.removeApplication();

            await clock.runAllAsync();

            const bodyApplications = document.getElementsByClassName(applications.body.class);
            chai.expect(bodyApplications.length).to.be.equal(1);

            const [fakeBodyApplicationRef] = bodyApplications;
            const fakeBodySlot = fakeBodyApplicationRef.parentNode;

            chai.expect(fakeBodyApplicationRef.id).to.be.equal(applications.body.id);

            chai.expect(window.getComputedStyle(fakeBodyApplicationRef, null).display).to.be.equal('block');
            chai.expect(slots.body.getComputedStyle().display).to.be.equal('none');
            chai.expect(window.getComputedStyle(fakeBodySlot, null).display).to.be.equal('block');

            chai.expect(fakeBodySlot.nodeName).to.be.equal(slots.body.ref.nodeName);
            chai.expect(fakeBodySlot.id).to.be.equal('');
            chai.expect(fakeBodySlot.className).to.be.equal('');

            chai.expect(spinner.getRef()).to.be.not.null;
            chai.expect(slots.body.getAttributeName()).to.be.equal(locationHash);

            slots.body.ref.appendChild(newBodyApplication.ref);

            await clock.runAllAsync();

            chai.expect(spinner.getRef()).to.be.null;
            chai.expect(slots.body.getComputedStyle().display).to.be.equal('block');
            chai.expect(slots.body.getAttributeName()).to.be.null;
        });
    });

    it('should destroy spinner when all fragments contain text nodes', async () => {
        const newBodyApplicationWithoutContent = {
            id: 'new-body-application',
            class: 'new-body-spa',
        };

        newBodyApplicationWithoutContent.ref = html`
            <div id="${newBodyApplicationWithoutContent.id}" class="${newBodyApplicationWithoutContent.class}"></div>
        `;

        applications.navbar.appendApplication();
        applications.body.appendApplication();

        handlePageTransition(slots.body.id, slotWillBe.rerendered);

        applications.body.removeApplication();
        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.not.null;

        slots.body.ref.appendChild(newBodyApplicationWithoutContent.ref);
        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.not.null;

        document.getElementById(newBodyApplicationWithoutContent.id).innerText =
            'Hello! I am contentful text, so now spinner will be removed';
        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.null;
    });

    it('should destroy spinner when all fragments contain optic nodes, e.g. input, select, img etc', async () => {
        const newBodyApplicationWithoutContent = {
            id: 'new-body-application',
            class: 'new-body-spa',
        };

        newBodyApplicationWithoutContent.ref = html`
            <div id="${newBodyApplicationWithoutContent.id}" class="${newBodyApplicationWithoutContent.class}"></div>
        `;

        applications.navbar.appendApplication();
        applications.body.appendApplication();

        handlePageTransition(slots.body.id, slotWillBe.rerendered);

        applications.body.removeApplication();
        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.not.null;

        slots.body.ref.appendChild(newBodyApplicationWithoutContent.ref);
        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.not.null;

        const elInput = document.createElement('input');
        document.getElementById(newBodyApplicationWithoutContent.id).appendChild(elInput);
        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.null;
    });

    it('should destroy spinner when all fragments contain visible nodes', async () => {
        const newBodyApplication = {
            id: 'new-body-application',
            class: 'new-body-spa',
        };

        newBodyApplication.ref = html`
            <div id="${newBodyApplication.id}" class="${newBodyApplication.class}" style="display: none;">
                Hello! I am hidden MS, so spinner is still visible
            </div>
        `;

        applications.navbar.appendApplication();
        applications.body.appendApplication();

        handlePageTransition(slots.body.id, slotWillBe.rerendered);

        applications.body.removeApplication();
        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.not.null;

        slots.body.ref.appendChild(newBodyApplication.ref);
        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.not.null;

        document.getElementById(newBodyApplication.id).style.display = '';
        await clock.runAllAsync();
        chai.expect(spinner.getRef()).to.be.null;
    });

    it('should destroy spinner when data attribute is set', async () => {
        const newBodyApplication = {
            id: 'new-body-application',
            class: 'new-body-spa',
        };

        newBodyApplication.ref = html` <div id="${newBodyApplication.id}" class="${newBodyApplication.class}"></div> `;

        applications.navbar.appendApplication();
        applications.body.appendApplication();

        handlePageTransition(slots.body.id, slotWillBe.rerendered);

        applications.body.removeApplication();
        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.not.null;

        slots.body.ref.appendChild(newBodyApplication.ref);
        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.not.null;

        document.getElementById(newBodyApplication.id).dataset.ilcSlotReady = true;
        await clock.runAllAsync();
        chai.expect(spinner.getRef()).to.be.null;
    });

    it('should remove CSS that is marked as non used when all fragments contain visible nodes', async () => {
        const newBodyApplication = {
            id: 'new-body-application',
            class: 'new-body-spa',
        };

        const link = html`<link
            rel="stylesheet"
            href="data:text/css,<style>div { border: 1px solid red; }</style>"
            ${CssTrackedApp.markedForRemovalAttribute}="true"
        />`;
        document.head.appendChild(link);

        newBodyApplication.ref = html`
            <div id="${newBodyApplication.id}" class="${newBodyApplication.class}" style="display: none;">
                Hello! I am hidden MS, so spinner is still visible
            </div>
        `;

        applications.navbar.appendApplication();
        applications.body.appendApplication();

        handlePageTransition(slots.body.id, slotWillBe.rerendered);

        applications.body.removeApplication();
        await clock.runAllAsync();
        chai.expect(document.querySelectorAll(`link[${CssTrackedApp.markedForRemovalAttribute}]`).length).to.equal(1);

        slots.body.ref.appendChild(newBodyApplication.ref);
        await clock.runAllAsync();
        chai.expect(document.querySelectorAll(`link[${CssTrackedApp.markedForRemovalAttribute}]`).length).to.equal(1);

        document.getElementById(newBodyApplication.id).style.display = '';
        await clock.runAllAsync();
        chai.expect(document.querySelectorAll(`link[${CssTrackedApp.markedForRemovalAttribute}]`).length).to.equal(0);
    });

    it('should destroy spinner in at least 300ms if it is appeared', async () => {
        const newBodyApplication = html` <div id="new-body-application" class="new-body-spa">Foo bar</div> `;

        applications.navbar.appendApplication();
        applications.body.appendApplication();

        handlePageTransition(slots.body.id, slotWillBe.rerendered);

        applications.body.removeApplication();

        await clock.tickAsync(299);
        chai.expect(spinner.getRef(), 'not be present before 300ms').to.be.null;
        await clock.tickAsync(1);

        chai.expect(spinner.getRef(), 'appear after 300ms').to.be.not.null;

        slots.body.ref.appendChild(newBodyApplication);

        await clock.tickAsync(499);
        chai.expect(spinner.getRef(), 'present until 500ms').to.be.not.null;

        await clock.tickAsync(1);
        chai.expect(spinner.getRef(), 'disappear after 500ms').to.be.null;
    });

    it('should throw error in case of double subscription to single SPA events', function () {
        chai.expect(function () {
            new TransitionManager(
                logger,
                {
                    enabled: true,
                    customHTML: `<div id="${spinner.id}" class="${spinner.class}">Hello! I am Spinner</div>`,
                },
                {},
            );
        }).to.throw();
    });

    it('should run scripts in customHTML', async () => {
        removePageTransactionListeners();

        const expectedClass = 'iAmSetFromCustomHTML';

        const transitionManager = new TransitionManager(
            logger,
            {
                enabled: true,
                customHTML: `
                <div id="${spinner.id}" class="${spinner.class}">Hello! I am Spinner</div>
                <script>document.querySelector('#${spinner.id}').classList.add('${expectedClass}')</script>
            `,
            },
            {},
        );

        removePageTransactionListeners = transitionManager.removeEventListeners.bind(transitionManager);
        const handlePageTransition = transitionManager.handlePageTransition.bind(transitionManager);

        applications.navbar.appendApplication();
        applications.body.appendApplication();

        handlePageTransition(slots.body.id, slotWillBe.rerendered);

        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.not.null;
        chai.expect(spinner.getRef().classList.value).to.include(expectedClass);

        spinner.getRef().remove();
    });

    it('should load default spinner when no customHTML provided', async () => {
        removePageTransactionListeners();
        const transitionManager = new TransitionManager(
            logger,
            {
                enabled: true,
            },
            {},
        );

        removePageTransactionListeners = transitionManager.removeEventListeners.bind(transitionManager);
        const handlePageTransition = transitionManager.handlePageTransition.bind(transitionManager);

        applications.navbar.appendApplication();
        applications.body.appendApplication();

        handlePageTransition(slots.body.id, slotWillBe.rerendered);
        await clock.runAllAsync();
        const spinnerEl = document.querySelector('dialog.ilcSpinnerWrapper');
        chai.expect(spinnerEl).to.be.not.null;
        chai.expect(spinnerEl.open).equals(true);
        chai.expect(spinnerEl.innerHTML).equals('loading....');
    });

    describe(`should trigger "${ilcEvents.ALL_SLOTS_LOADED}" only once`, () => {
        it('when spinner was not run', async () => {
            clock.restore();

            let runCount = 0;
            const handlerAllSlotsLoaded = () => {
                runCount++;
            };
            window.addEventListener(ilcEvents.ALL_SLOTS_LOADED, handlerAllSlotsLoaded);

            const newBodyApplication = html` <div id="new-body-application" class="new-body-spa">Foo bar</div> `;

            applications.navbar.appendApplication();
            applications.body.appendApplication();

            handlePageTransition(slots.body.id, slotWillBe.rerendered);

            applications.body.removeApplication();

            // render fragment immediately
            await new Promise((resolve) => setTimeout(resolve, 0));
            chai.expect(spinner.getRef()).to.be.null;

            slots.body.ref.appendChild(newBodyApplication);

            await new Promise((resolve) => setTimeout(resolve, 0));
            chai.expect(spinner.getRef()).to.be.null;

            chai.expect(runCount).to.equals(1);

            window.removeEventListener(ilcEvents.ALL_SLOTS_LOADED, handlerAllSlotsLoaded);
        });

        it('when spinner was run and "min time" was not exceeded', async () => {
            let runCount = 0;
            const handlerAllSlotsLoaded = () => {
                runCount++;
            };
            window.addEventListener(ilcEvents.ALL_SLOTS_LOADED, handlerAllSlotsLoaded);

            const newBodyApplication = html` <div id="new-body-application" class="new-body-spa">Foo bar</div> `;

            applications.navbar.appendApplication();
            applications.body.appendApplication();

            handlePageTransition(slots.body.id, slotWillBe.rerendered);

            applications.body.removeApplication();

            // render spinner
            await clock.tickAsync(300);

            chai.expect(spinner.getRef()).to.be.not.null;

            slots.body.ref.appendChild(newBodyApplication);

            // spinner is visible, but all slots are rendered so "ilc:all-slots-loaded" was fired
            await clock.tickAsync(480);
            chai.expect(spinner.getRef()).to.be.not.null;
            chai.expect(runCount).to.equals(1);

            // spinner is removed but "ilc:all-slots-loaded" was not fired second time
            await clock.tickAsync(20);
            chai.expect(spinner.getRef()).to.be.null;
            chai.expect(runCount).to.equals(1);

            window.removeEventListener(ilcEvents.ALL_SLOTS_LOADED, handlerAllSlotsLoaded);
        });

        it('when spinner was run and "min time" was exceeded', async () => {
            let runCount = 0;
            const handlerAllSlotsLoaded = () => {
                runCount++;
            };
            window.addEventListener(ilcEvents.ALL_SLOTS_LOADED, handlerAllSlotsLoaded);

            const newBodyApplication = html` <div id="new-body-application" class="new-body-spa">Foo bar</div> `;

            applications.navbar.appendApplication();
            applications.body.appendApplication();

            handlePageTransition(slots.body.id, slotWillBe.rerendered);

            applications.body.removeApplication();

            // render spinner
            await clock.tickAsync(300);
            chai.expect(spinner.getRef()).to.be.not.null;

            slots.body.ref.appendChild(newBodyApplication);

            // spinner disappeared 100ms ago and "ilc:all-slots-loaded" was fired only once
            await clock.tickAsync(600);
            chai.expect(spinner.getRef()).to.be.null;
            chai.expect(runCount).to.equals(1);

            window.removeEventListener(ilcEvents.ALL_SLOTS_LOADED, handlerAllSlotsLoaded);
        });
    });
});
