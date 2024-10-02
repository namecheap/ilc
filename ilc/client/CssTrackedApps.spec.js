import sinon from 'sinon';
import { expect } from 'chai';
import { CssTrackedApp } from './CssTrackedApp';

const ilcTestAttributeName = 'data-ilc-test';

function appendCssToPage(cssLink) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssLink;
    link.setAttribute(ilcTestAttributeName, 'true');
    document.body.appendChild(link);
    return link;
}

function createOriginalAppFake(returnValue) {
    return {
        bootstrap: sinon.fake.returns(returnValue),
        mount: sinon.fake.returns(returnValue),
        unmount: sinon.fake.returns(returnValue),
        update: sinon.fake.returns(returnValue),
    };
}

describe('CssTrackedApp', function () {
    afterEach(() => {
        Array.from(document.querySelectorAll(`link[${ilcTestAttributeName}]`))
            .concat(Array.from(document.querySelectorAll(`link[${CssTrackedApp.linkUsagesAttribute}]`)))
            .forEach((link) => link.remove());
    });

    it('should delegate calls to original app', async () => {
        const returnValue = Math.random();
        const originalApp = createOriginalAppFake(Promise.resolve(returnValue));

        const cssWrap = new CssTrackedApp(
            originalApp,
            'data:text/css,<style>div { border: 1px solid red; }</style>',
            false,
        ).getDecoratedApp();

        await Promise.all(
            Object.keys(originalApp).map(async (method) => {
                const actualReturnValue = await cssWrap[method]();

                expect(originalApp[method].calledOnce).to.equal(true, `${method} is not called`);
                expect(actualReturnValue).to.equal(returnValue, method);
            }),
        );
    });

    describe('createNew', () => {
        it('should return original instance if createNew is not IlcAdapter', async () => {
            const originalApp = createOriginalAppFake(Promise.resolve(Math.random()));
            originalApp.createNew = () => Promise.resolve(1);

            const cssWrap = new CssTrackedApp(originalApp, 'data:text/css,<style></style>', false).getDecoratedApp();
            const newInstance = await cssWrap.createNew();

            expect(newInstance).to.equal(1);
        });

        it('should return original instance if createNew does not return Promise', async () => {
            const originalApp = createOriginalAppFake(Promise.resolve(Math.random()));
            originalApp.createNew = () => 1;

            const cssWrap = new CssTrackedApp(originalApp, 'data:text/css,<style></style>', false).getDecoratedApp();
            const newInstance = cssWrap.createNew();

            expect(newInstance).to.equal(1);
        });

        it('should delegate calls to original app if app is created via createNew', async () => {
            const returnValue = Math.random();
            const appOnCreateNew = createOriginalAppFake(Promise.resolve(returnValue));
            const originalApp = createOriginalAppFake(Promise.resolve(Math.random()));
            originalApp.createNew = () => Promise.resolve(appOnCreateNew);

            const cssWrap = new CssTrackedApp(
                originalApp,
                'data:text/css,<style>div { border: 1px solid red; }</style>',
                false,
            ).getDecoratedApp();
            const newApp = await cssWrap.createNew();

            await Promise.all(
                Object.keys(appOnCreateNew).map(async (method) => {
                    const actualReturnValue = await newApp[method]();

                    expect(appOnCreateNew[method].calledOnce).to.equal(true, `${method} is not called`);
                    expect(actualReturnValue).to.equal(returnValue, method);
                }),
            );
        });

        it('should remove CSS link after createNew, mount, and unmount', async () => {
            const returnValue = Math.random();
            const appOnCreateNew = createOriginalAppFake(Promise.resolve(returnValue));
            const originalApp = createOriginalAppFake(Promise.resolve(Math.random()));
            originalApp.createNew = () => Promise.resolve(appOnCreateNew);

            const cssLink = 'data:text/css,<style>div { border: 1px solid blue; }</style>';
            const cssWrap = new CssTrackedApp(originalApp, cssLink, false).getDecoratedApp();

            const newApp = await cssWrap.createNew();

            await newApp.mount();

            let link = document.querySelector(`link[href="${cssLink}"]`);
            expect(link).to.not.be.null;
            expect(link.getAttribute(CssTrackedApp.linkUsagesAttribute)).to.equal('1');

            await newApp.unmount();

            link = document.querySelector(`link[href="${cssLink}"]`);
            expect(link).to.be.null;
        });
    });

    it('should add counter to css on mount', async () => {
        const originalApp = createOriginalAppFake(Promise.resolve('does_not_matter'));
        const cssLink = 'https://mycdn.me/styles.css';
        const link = appendCssToPage(cssLink);

        const cssWrap = new CssTrackedApp(originalApp, cssLink, false).getDecoratedApp();

        await cssWrap.mount();
        expect(link.getAttribute(CssTrackedApp.linkUsagesAttribute)).to.equal('1');

        await cssWrap.mount();
        expect(link.getAttribute(CssTrackedApp.linkUsagesAttribute)).to.equal('2');
    });

    it('should unmark css from removal if app is mounted again and css removal is delayed', async () => {
        const originalApp = createOriginalAppFake(Promise.resolve('does_not_matter'));
        const cssLink = 'https://mycdn.me/styles.css';
        const link = appendCssToPage(cssLink);
        link.setAttribute(CssTrackedApp.linkUsagesAttribute, '1');

        const cssWrap = new CssTrackedApp(originalApp, cssLink, true).getDecoratedApp();
        await cssWrap.unmount();

        const cssWrap2 = new CssTrackedApp(originalApp, cssLink, true).getDecoratedApp();
        await cssWrap2.mount();

        expect(link.getAttribute(CssTrackedApp.markedForRemovalAttribute)).to.be.null;
    });

    it('should decrement counter to css usage on unmount', async () => {
        const originalApp = createOriginalAppFake(Promise.resolve('does_not_matter'));
        const cssLink = 'https://mycdn.me/styles.css';
        const link = appendCssToPage(cssLink);
        link.setAttribute(CssTrackedApp.linkUsagesAttribute, '4');

        const cssWrap = new CssTrackedApp(originalApp, cssLink, false).getDecoratedApp();
        await cssWrap.unmount();

        expect(link.getAttribute(CssTrackedApp.linkUsagesAttribute)).to.equal('3');
    });

    it('should remove CSS on umount if no usages left', async () => {
        const originalApp = createOriginalAppFake(Promise.resolve('does_not_matter'));
        const cssLink = 'https://mycdn.me/styles.css';
        const link = appendCssToPage(cssLink);
        link.setAttribute(CssTrackedApp.linkUsagesAttribute, '1');

        const cssWrap = new CssTrackedApp(originalApp, cssLink, false).getDecoratedApp();
        await cssWrap.unmount();

        expect(link.parentNode).to.equal(null);
    });

    it('should remove CSS on umount if no usages have been set (i.e. app is rendered on SSR)', async () => {
        const originalApp = createOriginalAppFake(Promise.resolve('does_not_matter'));
        const cssLink = 'https://mycdn.me/styles.css';
        const link = appendCssToPage(cssLink);

        const cssWrap = new CssTrackedApp(originalApp, cssLink, false).getDecoratedApp();
        await cssWrap.unmount();

        expect(link.parentNode).to.equal(null);
    });

    it('application remount restores CSS into DOM', async () => {
        const originalApp = createOriginalAppFake(Promise.resolve('does_not_matter'));
        const cssLink = 'data:text/css,<style>div { border: 1px solid red; }</style>';

        // Scenario from real life:
        //   app is rendered on page via SSR, CSS link has come with the response
        appendCssToPage(cssLink);
        const cssWrap = new CssTrackedApp(originalApp, cssLink, false).getDecoratedApp();
        await cssWrap.mount();

        //   route is changed and app is unmounted and CSS is removed
        await cssWrap.unmount();

        //   app is loaded and mounted one more time via dynamic load, (i.e. app is embedded into another app) (here css should be injected into DOM again)
        await cssWrap.mount();
        const newLink = document.querySelector(`link[href="${cssLink}"]`);
        expect(newLink).to.not.be.null;
        expect(newLink.getAttribute(CssTrackedApp.linkUsagesAttribute)).to.equal('1');

        //   dynamically mounted app is unmounted, and CSS is removed from DOM again
        await cssWrap.unmount();
        expect(newLink.parentNode).to.be.null;
    });

    it('should return parcels if original app contains them', () => {
        const originalApp = createOriginalAppFake(Promise.resolve('does_not_matter'));
        originalApp.parcels = { someParcel: () => {} };

        const cssLink = 'data:text/css,<style>div { border: 1px solid red; }</style>';

        const cssWrap = new CssTrackedApp(originalApp, cssLink, false).getDecoratedApp();

        expect(cssWrap.parcels).to.equal(originalApp.parcels);
    });

    describe('when CSS removal is delayed', () => {
        it('should mark CSS as ready for removal', async () => {
            const originalApp = createOriginalAppFake(Promise.resolve('does_not_matter'));
            const cssLink = 'data:text/css,<style>div { border: 1px solid red; }</style>';
            const link = appendCssToPage(cssLink);

            const cssWrap = new CssTrackedApp(originalApp, cssLink, true).getDecoratedApp();
            await cssWrap.unmount();

            expect(link.parentNode).to.equal(document.body);
            expect(link.getAttribute(CssTrackedApp.markedForRemovalAttribute)).to.equal('true');
        });
    });
});
