import chai from 'chai';
import sinon from 'sinon';
import html from 'nanohtml';

import handlePageTransaction, {
    slotCanBe,
} from './handlePageTransaction';

describe('handle page transaction', () => {
    const locationHash = 'i-am-location-hash';

    const slots = {
        id: 'slots',
        appendSlots: () => document.body.appendChild(slots.ref),
        removeSlots: () => document.body.removeChild(slots.ref),
        navbar: {
            id: 'navbar',
            getComputedStyle: () => window.getComputedStyle(slots.navbar.ref, null),
        },
        body: {
            id: 'body',
            getComputedStyle: () => window.getComputedStyle(slots.body.ref, null),
            getAttributeName: () => document.body.getAttribute('name'),
        },
    };

    const applications = {
        navbar: {
            id: 'navbar-application',
            class: 'navbar-spa-application',
            appendApplication: () => slots.navbar.ref.appendChild(applications.navbar.ref),
        },
        body: {
            id: 'body-application',
            class: 'body-spa-application',
            appendApplication: () => slots.body.ref.appendChild(applications.body.ref),
            removeApplication: () => slots.body.ref.removeChild(applications.body.ref)
        },
    };

    const spinner = {
        id: 'ilc-spinner',
        class: 'ilc-spinner',
        getRef: () => document.getElementById(spinner.id),
    };

    let clock;

    beforeEach(() => {
        window.location.hash = locationHash;

        window.ilcConfig = {
            tmplSpinner: `<div id="${spinner.id}" class="${spinner.class}">Hello! I am Spinner</div>`,
        };

        applications.navbar.ref = html`
            <div id="${applications.navbar.id}" class="${applications.navbar.class}">
                Hello! I am Navbar SPA application
            </div>`;

        applications.body.ref = html`
            <div id="${applications.body.id}" class="${applications.body.class}">
                Hello! I am Body SPA application
            </div>`;

        slots.ref = html`
            <div id="${slots.id}">
                <div id="${slots.navbar.id}"></div>
                <div id="${slots.body.id}"></div>
            </div>`;

        slots.appendSlots();

        slots.navbar.ref = document.getElementById(slots.navbar.id);
        slots.body.ref = document.getElementById(slots.body.id);

        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        slots.removeSlots();
        clock.restore();
    });

    it('should do nothing when a slot name or a slot action are not provided', async () => {
        handlePageTransaction(null, null);

        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.null;
        chai.expect(slots.ref.innerHTML).to.be.equal(
            `<div id="${slots.navbar.id}"></div>` +
            `<div id="${slots.body.id}"></div>`
        );
    });

    it('should do nothing when a slot action does not match any possible option to handle', async () => {
        handlePageTransaction(slots.body.id, 'undefined');

        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.null;
        chai.expect(slots.ref.innerHTML).to.be.equal(
            `<div id="${slots.navbar.id}"></div>` +
            `<div id="${slots.body.id}"></div>`
        );

        applications.body.appendApplication();

        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.null;
        chai.expect(slots.ref.innerHTML).to.be.equal(
            `<div id="${slots.navbar.id}"></div>` +
            `<div id="${slots.body.id}">` +
            `<div id="${applications.body.id}" class="${applications.body.class}">` +
            'Hello! I am Body SPA application' +
            '</div>' +
            '</div>'
        );

        applications.body.removeApplication();

        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.null;
        chai.expect(slots.ref.innerHTML).to.be.equal(
            `<div id="${slots.navbar.id}"></div>` +
            `<div id="${slots.body.id}"></div>`
        );
    });

    it('should listen to slot content changes when a slot is going to be rendered', async () => {
        handlePageTransaction(slots.navbar.id, slotCanBe.rendered);

        await clock.runAllAsync();

        chai.expect(spinner.getRef()).to.be.not.null;
        chai.expect(slots.navbar.getComputedStyle().display).to.be.equal('none');
        chai.expect(slots.body.getAttributeName()).to.be.equal(locationHash);

        handlePageTransaction(slots.body.id, slotCanBe.rendered);

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

        handlePageTransaction(slots.body.id, slotCanBe.removed);

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

    it('should render a fake slot and listen to slot content changes when a slot is going to be rerendered', async () => {
        const newBodyApplication = {
            id: 'new-body-application',
            class: 'new-body-spa-application',
        };

        newBodyApplication.ref = html`
            <div id="${newBodyApplication.id}" class="${newBodyApplication.class}">
                Hello! I am new Body SPA application
            </div>
        `;

        applications.navbar.appendApplication();
        applications.body.appendApplication();

        handlePageTransaction(slots.body.id, slotCanBe.rerendered);

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
});
