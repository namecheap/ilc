import WrapApp from './WrapApp';
import chai from 'chai';
import sinon from 'sinon';

describe('WrapApp', () => {
    const appCallbacksFake = {
        bootstrap: sinon.spy(() => Promise.resolve()),
        mount: sinon.spy(() => Promise.resolve()),
        unmount: sinon.spy(() => Promise.resolve()),
    };

    const wrapperCallbacksFake = {
        bootstrap: sinon.spy(() => Promise.resolve()),
        mount: sinon.spy(() => Promise.resolve()),
        unmount: sinon.spy(() => Promise.resolve()),
    };

    const appCallbacksFakeArray = {
        bootstrap: [sinon.spy(() => Promise.resolve()), sinon.spy(() => Promise.resolve())],
        mount: [sinon.spy(() => Promise.resolve()), sinon.spy(() => Promise.resolve())],
        unmount: [sinon.spy(() => Promise.resolve()), sinon.spy(() => Promise.resolve())],
    }

    const wrapperCallbacksFakeArray = {
        bootstrap: [sinon.spy(() => Promise.resolve()), sinon.spy(() => Promise.resolve())],
        mount: [sinon.spy(() => Promise.resolve()), sinon.spy(() => Promise.resolve())],
        unmount: [sinon.spy(() => Promise.resolve()), sinon.spy(() => Promise.resolve())],
    }

    /**
     * Reset `appCallbacksFake` callbacks history
     */
    function appCallbacksFakeResetHistory() {
        Object.keys(appCallbacksFake).forEach((key) => appCallbacksFake[key].resetHistory());
    }

    /**
     * Reset `wrapperCallbacksFake` callbacks history
     */
    function wrapperCallbacksFakeResetHistory() {
        Object.keys(wrapperCallbacksFake).forEach((key) => wrapperCallbacksFake[key].resetHistory());
    }

    /**
     * Reset `appCallbacksFakeArray` callbacks history
     */
    function appCallbacksFakeArrayResetHistory() {
        Object.keys(appCallbacksFakeArray).forEach((key) => appCallbacksFakeArray[key].forEach((func) => func.resetHistory()));
    }

    /**
     * Reset `wrapperCallbacksFakeArray` callbacks history
     */
    function wrapperCallbacksFakeArrayResetHistory() {
        Object.keys(wrapperCallbacksFakeArray).forEach((key) => wrapperCallbacksFakeArray[key].forEach((func) => func.resetHistory()));
    }

    /**
     * Init fake <script type="ilc-config">...</script>
     * @param {Object} config
     */
    function initFakeIlcConfig(config = {}) {
        const existentIlcConfigScriptEl = document.querySelector('script[type="ilc-config"]');

        if (existentIlcConfigScriptEl) {
            existentIlcConfigScriptEl.innerHTML = JSON.stringify(config);
            return;
        }

        const ilcConfigScriptElAttr = document.createAttribute('type');
        ilcConfigScriptElAttr.value = 'ilc-config';

        const ilcConfigScriptEl = document.createElement('script');
        ilcConfigScriptEl.innerHTML = JSON.stringify(config);

        ilcConfigScriptEl.attributes.setNamedItem(ilcConfigScriptElAttr);
        document.head.appendChild(ilcConfigScriptEl);
    }

    /**
     * Init fake slot <div id="name"></div>
     * @param name
     */
    function initFakeSlot(name) {
        const existentSlotEl = document.getElementById(name);

        if (existentSlotEl) {
            existentSlotEl.innerHTML = '';
            return;
        }

        const slotEl = document.createElement('div');
        slotEl.id = name;
        document.body.appendChild(slotEl);
    }

    /**
     * Wrapping your sinon spied functions with chai expectations
     * to confirm that functions are being called
     * @param {Array<Function>} spiedFunctions
     */
    function expectCallbacksToBeCalled(spiedFunctions) {
        for (const func of spiedFunctions) {
            chai.expect(func.called).to.be.true;
        }
    }

    /**
     * Wrapping your sinon spied functions with chai expectations
     * to confirm that functions are not being called
     * @param {Array<Function>} spiedFunctions
     */
    function expectCallbacksToNotBeCalled(spiedFunctions) {
        for (const func of spiedFunctions) {
            chai.expect(func.called).to.be.false
        }
    }

    beforeEach(() => {
        initFakeIlcConfig();
        initFakeSlot('body');
    });

    afterEach(() => {
        appCallbacksFakeResetHistory();
        wrapperCallbacksFakeResetHistory();
        appCallbacksFakeArrayResetHistory();
        wrapperCallbacksFakeArrayResetHistory();
    });

    it('should bootstrap wrapper', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        await bootstrap({ appId: 'wrappedApp__at__body' });

        chai.expect(wrapperCallbacksFake.bootstrap.called).to.be.true;
        chai.expect(appCallbacksFake.bootstrap.called).to.be.false;
    });

    it('should bootstrap wrapper with array of callbacks', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap } = wrapApp.wrapWith(appCallbacksFakeArray, wrapperCallbacksFakeArray);

        await bootstrap({ appId: 'wrappedApp__at__body' });

        expectCallbacksToBeCalled([ ...wrapperCallbacksFakeArray.bootstrap ]);
        expectCallbacksToNotBeCalled([ ...appCallbacksFakeArray.bootstrap ]);
    });

    it('should mount wrapper', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });

        chai.expect(wrapperCallbacksFake.mount.called).to.be.true;
        chai.expect(appCallbacksFake.mount.called).to.be.false;
    });

    it('should mount wrapper [arrayed callbacks]', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount } = wrapApp.wrapWith(appCallbacksFakeArray, wrapperCallbacksFakeArray);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });

        expectCallbacksToBeCalled([ ...wrapperCallbacksFakeArray.mount ]);
        expectCallbacksToNotBeCalled([ ...appCallbacksFakeArray.mount ]);
    });

    it('should unmount wrapper', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });
        await unmount({ appId: 'wrappedApp__at__body' });

        chai.expect(wrapperCallbacksFake.unmount.called).to.be.true;
        chai.expect(appCallbacksFake.unmount.called).to.be.false;
    });

    it('should unmount wrapper [arrayed callbacks]', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFakeArray, wrapperCallbacksFakeArray);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });
        await unmount({ appId: 'wrappedApp__at__body' });

        expectCallbacksToBeCalled([ ...wrapperCallbacksFakeArray.unmount ]);
        expectCallbacksToNotBeCalled([ ...appCallbacksFakeArray.unmount ]);
    });

    it('should forward a correct appId for wrapper callbacks', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });
        await unmount({ appId: 'wrappedApp__at__body' });

        const wrapperBootstrapFuncArgs = wrapperCallbacksFake.bootstrap.args[0][0];
        const wrapperMountFuncArgs = wrapperCallbacksFake.mount.args[0][0];
        const wrapperUnmountFuncArgs = wrapperCallbacksFake.unmount.args[0][0];

        const expectedAppId = 'wrapper__at__body';

        chai.expect(wrapperBootstrapFuncArgs.appId).to.be.equal(expectedAppId);
        chai.expect(wrapperMountFuncArgs.appId).to.be.equal(expectedAppId);
        chai.expect(wrapperUnmountFuncArgs.appId).to.be.equal(expectedAppId);
    });


    it('should forward a correct wrapperAppData wrapper callbacks', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });
        await unmount({ appId: 'wrappedApp__at__body' });

        const wrapperBootstrapFuncArgs = wrapperCallbacksFake.bootstrap.args[0][0];
        const wrapperMountFuncArgs = wrapperCallbacksFake.mount.args[0][0];
        const wrapperUnmountFuncArgs = wrapperCallbacksFake.unmount.args[0][0];

        const expectedAppId = 'wrapper__at__body';

        chai.expect(wrapperBootstrapFuncArgs.appWrapperData.appId).to.be.equal(expectedAppId);
        chai.expect(wrapperMountFuncArgs.appWrapperData.appId).to.be.equal(expectedAppId);
        chai.expect(wrapperUnmountFuncArgs.appWrapperData.appId).to.be.equal(expectedAppId);
    });

    it('should forward a correct appId for wrapper callbacks [arrayed callbacks]', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFakeArray, wrapperCallbacksFakeArray);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });
        await unmount({ appId: 'wrappedApp__at__body' });

        const wrapperBootstrapFunc0Args = wrapperCallbacksFakeArray.bootstrap[0].args[0][0];
        const wrapperBootstrapFunc1Args = wrapperCallbacksFakeArray.bootstrap[1].args[0][0];
        const wrapperMountFunc0Args = wrapperCallbacksFakeArray.mount[0].args[0][0];
        const wrapperMountFunc1Args = wrapperCallbacksFakeArray.mount[1].args[0][0];
        const wrapperUnmountFunc0Args = wrapperCallbacksFakeArray.unmount[0].args[0][0];
        const wrapperUnmountFunc1Args = wrapperCallbacksFakeArray.unmount[1].args[0][0];

        const expectedAppId = 'wrapper__at__body';

        chai.expect(wrapperBootstrapFunc0Args.appId).to.be.equal(expectedAppId);
        chai.expect(wrapperBootstrapFunc1Args.appId).to.be.equal(expectedAppId);
        chai.expect(wrapperMountFunc0Args.appId).to.be.equal(expectedAppId);
        chai.expect(wrapperMountFunc1Args.appId).to.be.equal(expectedAppId);
        chai.expect(wrapperUnmountFunc0Args.appId).to.be.equal(expectedAppId);
        chai.expect(wrapperUnmountFunc1Args.appId).to.be.equal(expectedAppId);
    });

    it('should forward a correct current base path for wrapper callbacks', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });
        await unmount({ appId: 'wrappedApp__at__body' });

        const wrapperBootstrapFuncArgs = wrapperCallbacksFake.bootstrap.args[0][0];
        const wrapperMountFuncArgs = wrapperCallbacksFake.mount.args[0][0];
        const wrapperUnmountFuncArgs = wrapperCallbacksFake.unmount.args[0][0];

        const expectedCurrentBasePath = '/';

        chai.expect(wrapperBootstrapFuncArgs.getCurrentBasePath()).to.be.equal(expectedCurrentBasePath);
        chai.expect(wrapperMountFuncArgs.getCurrentBasePath()).to.be.equal(expectedCurrentBasePath);
        chai.expect(wrapperUnmountFuncArgs.getCurrentBasePath()).to.be.equal(expectedCurrentBasePath);
    });

    it('should forward a correct current base path for wrapper callbacks [arrayed callbacks]', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFakeArray, wrapperCallbacksFakeArray);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });
        await unmount({ appId: 'wrappedApp__at__body' });

        const wrapperBootstrapFunc0Args = wrapperCallbacksFakeArray.bootstrap[0].args[0][0];
        const wrapperBootstrapFunc1Args = wrapperCallbacksFakeArray.bootstrap[1].args[0][0];
        const wrapperMountFunc0Args = wrapperCallbacksFakeArray.mount[0].args[0][0];
        const wrapperMountFunc1Args = wrapperCallbacksFakeArray.mount[1].args[0][0];
        const wrapperUnmountFunc0Args = wrapperCallbacksFakeArray.unmount[0].args[0][0];
        const wrapperUnmountFunc1Args = wrapperCallbacksFakeArray.unmount[1].args[0][0];

        const expectedCurrentBasePath = '/';

        chai.expect(wrapperBootstrapFunc0Args.getCurrentBasePath()).to.be.equal(expectedCurrentBasePath);
        chai.expect(wrapperBootstrapFunc1Args.getCurrentBasePath()).to.be.equal(expectedCurrentBasePath);
        chai.expect(wrapperMountFunc0Args.getCurrentBasePath()).to.be.equal(expectedCurrentBasePath);
        chai.expect(wrapperMountFunc1Args.getCurrentBasePath()).to.be.equal(expectedCurrentBasePath);
        chai.expect(wrapperUnmountFunc0Args.getCurrentBasePath()).to.be.equal(expectedCurrentBasePath);
        chai.expect(wrapperUnmountFunc1Args.getCurrentBasePath()).to.be.equal(expectedCurrentBasePath);
    });

    it('should forward a correct props for wrapper callbacks', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });
        await unmount({ appId: 'wrappedApp__at__body' });

        const wrapperBootstrapFuncArgs = wrapperCallbacksFake.bootstrap.args[0][0];
        const wrapperMountFuncArgs = wrapperCallbacksFake.mount.args[0][0];
        const wrapperUnmountFuncArgs = wrapperCallbacksFake.unmount.args[0][0];

        const expectedCurrentPathProps = { prop: 'value' };

        chai.expect(wrapperBootstrapFuncArgs.getCurrentPathProps()).to.deep.equal(expectedCurrentPathProps);
        chai.expect(wrapperMountFuncArgs.getCurrentPathProps()).to.deep.equal(expectedCurrentPathProps);
        chai.expect(wrapperUnmountFuncArgs.getCurrentPathProps()).to.deep.equal(expectedCurrentPathProps);
    });

    it('should forward a correct props for wrapper callbacks [arrayed callbacks]', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFakeArray, wrapperCallbacksFakeArray);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });
        await unmount({ appId: 'wrappedApp__at__body' });

        const wrapperBootstrapFunc0Args = wrapperCallbacksFakeArray.bootstrap[0].args[0][0];
        const wrapperBootstrapFunc1Args = wrapperCallbacksFakeArray.bootstrap[1].args[0][0];
        const wrapperMountFunc0Args = wrapperCallbacksFakeArray.mount[0].args[0][0];
        const wrapperMountFunc1Args = wrapperCallbacksFakeArray.mount[1].args[0][0];
        const wrapperUnmountFunc0Args = wrapperCallbacksFakeArray.unmount[0].args[0][0];
        const wrapperUnmountFunc1Args = wrapperCallbacksFakeArray.unmount[1].args[0][0];

        const expectedCurrentPathProps = { prop: 'value' };

        chai.expect(wrapperBootstrapFunc0Args.getCurrentPathProps()).to.deep.equal(expectedCurrentPathProps);
        chai.expect(wrapperBootstrapFunc1Args.getCurrentPathProps()).to.deep.equal(expectedCurrentPathProps);
        chai.expect(wrapperMountFunc0Args.getCurrentPathProps()).to.deep.equal(expectedCurrentPathProps);
        chai.expect(wrapperMountFunc1Args.getCurrentPathProps()).to.deep.equal(expectedCurrentPathProps);
        chai.expect(wrapperUnmountFunc0Args.getCurrentPathProps()).to.deep.equal(expectedCurrentPathProps);
        chai.expect(wrapperUnmountFunc1Args.getCurrentPathProps()).to.deep.equal(expectedCurrentPathProps);
    });

    it('should bootstrap wrapped app', async () => {
        const wrapApp = new WrapApp(
            { appId: 'wrapper__at__body', kind: 'wrapper', spaBundle: 'http://localhost/client-entry.js', props: { prop: 'value' } },
            { fromLocation: 1, propFromWrapper: 'AAAAA' },
        );

        const { bootstrap } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        await bootstrap({ appId: 'wrappedApp__at__body' });

        chai.expect(appCallbacksFake.bootstrap.called).to.be.true;
        chai.expect(wrapperCallbacksFake.bootstrap.called).to.be.false;
    });

    it('should bootstrap wrapped app [arrayed callbacks]', async () => {
        const wrapApp = new WrapApp(
            { appId: 'wrapper__at__body', kind: 'wrapper', spaBundle: 'http://localhost/client-entry.js', props: { prop: 'value' } },
            { fromLocation: 1, propFromWrapper: 'AAAAA' },
        );

        const { bootstrap } = wrapApp.wrapWith(appCallbacksFakeArray, wrapperCallbacksFakeArray);

        await bootstrap({ appId: 'wrappedApp__at__body' });

        expectCallbacksToBeCalled([ ...appCallbacksFakeArray.bootstrap ]);
        expectCallbacksToNotBeCalled([ ...wrapperCallbacksFakeArray.bootstrap ]);
    });

    it('should mount wrapped app', async () => {
        const wrapApp = new WrapApp(
            { appId: 'wrapper__at__body', kind: 'wrapper', spaBundle: 'http://localhost/client-entry.js', props: { prop: 'value' } },
            { fromLocation: 1, propFromWrapper: 'AAAAA' },
        );

        const { bootstrap, mount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });

        chai.expect(appCallbacksFake.mount.called).to.be.true;
        chai.expect(wrapperCallbacksFake.mount.called).to.be.false;
    });

    it('should mount wrapped app [arrayed callbacks]', async () => {
        const wrapApp = new WrapApp(
            { appId: 'wrapper__at__body', kind: 'wrapper', spaBundle: 'http://localhost/client-entry.js', props: { prop: 'value' } },
            { fromLocation: 1, propFromWrapper: 'AAAAA' },
        );

        const { bootstrap, mount } = wrapApp.wrapWith(appCallbacksFakeArray, wrapperCallbacksFakeArray);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });

        expectCallbacksToBeCalled([ ...appCallbacksFakeArray.mount ]);
        expectCallbacksToNotBeCalled([ ...wrapperCallbacksFakeArray.mount ]);
    });

    it('should unmount wrapped app', async () => {
        const wrapApp = new WrapApp(
            { appId: 'wrapper__at__body', kind: 'wrapper', spaBundle: 'http://localhost/client-entry.js', props: { prop: 'value' } },
            { fromLocation: 1, propFromWrapper: 'AAAAA' },
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });
        await unmount({ appId: 'wrappedApp__at__body' });

        chai.expect(appCallbacksFake.unmount.called).to.be.true;
        chai.expect(wrapperCallbacksFake.unmount.called).to.be.false;
    });

    it('should unmount wrapped app [arrayed callbacks]', async () => {
        const wrapApp = new WrapApp(
            { appId: 'wrapper__at__body', kind: 'wrapper', spaBundle: 'http://localhost/client-entry.js', props: { prop: 'value' } },
            { fromLocation: 1, propFromWrapper: 'AAAAA' },
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFakeArray, wrapperCallbacksFakeArray);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });
        await unmount({ appId: 'wrappedApp__at__body' });

        expectCallbacksToBeCalled([ ...appCallbacksFakeArray.unmount ]);
        expectCallbacksToNotBeCalled([ ...wrapperCallbacksFakeArray.unmount ]);
    });

    it('should forward a correct appId for wrapped app callbacks', async () => {
        const wrapApp = new WrapApp(
            { appId: 'wrapper__at__body', kind: 'wrapper', spaBundle: 'http://localhost/client-entry.js', props: { prop: 'value' } },
            { fromLocation: 1, propFromWrapper: 'AAAAA' },
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });
        await unmount({ appId: 'wrappedApp__at__body' });

        const appBootstrapFuncArgs = appCallbacksFake.bootstrap.args[0][0];
        const appMountFuncArgs = appCallbacksFake.mount.args[0][0];
        const appUnmountFuncArgs = appCallbacksFake.unmount.args[0][0];

        const expectedAppId = 'wrappedApp__at__body';

        chai.expect(appBootstrapFuncArgs.appId).to.be.equal(expectedAppId);
        chai.expect(appMountFuncArgs.appId).to.be.equal(expectedAppId);
        chai.expect(appUnmountFuncArgs.appId).to.be.equal(expectedAppId);
    });

    it('should forward a correct props for wrapped app callbacks [arrayed callbacks]', async () => {
        const wrapApp = new WrapApp(
            { appId: 'wrapper__at__body', kind: 'wrapper', spaBundle: 'http://localhost/client-entry.js', props: { prop: 'value' } },
            { fromLocation: 1, propFromWrapper: 'AAAAA' },
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFakeArray, wrapperCallbacksFakeArray);

        await bootstrap({ getCurrentPathProps: () => ({ bootstrapProp: 'value' }), appId: 'wrappedApp__at__body' });
        await mount({ getCurrentPathProps: () => ({ mountProp: 'value' }), appId: 'wrappedApp__at__body' });
        await unmount({ getCurrentPathProps: () => ({ unmountProp: 'value' }), appId: 'wrappedApp__at__body' });

        const appBootstrapFunc0Args = appCallbacksFakeArray.bootstrap[0].args[0][0];
        const appBootstrapFunc1Args = appCallbacksFakeArray.bootstrap[1].args[0][0];
        const appMountFunc0Args = appCallbacksFakeArray.mount[0].args[0][0];
        const appMountFunc1Args = appCallbacksFakeArray.mount[1].args[0][0];
        const appUnmountFunc0Args = appCallbacksFakeArray.unmount[0].args[0][0];
        const appUnmountFunc1Args = appCallbacksFakeArray.unmount[1].args[0][0];

        const expectedBootstrapProps = { bootstrapProp: 'value' };
        const expectedMountProps = { mountProp: 'value' };
        const expectedUnmountProps = { unmountProp: 'value' };

        chai.expect(appBootstrapFunc0Args.getCurrentPathProps()).to.deep.equal(expectedBootstrapProps);
        chai.expect(appBootstrapFunc1Args.getCurrentPathProps()).to.deep.equal(expectedBootstrapProps);
        chai.expect(appMountFunc0Args.getCurrentPathProps()).to.deep.equal(expectedMountProps);
        chai.expect(appMountFunc1Args.getCurrentPathProps()).to.deep.equal(expectedMountProps);
        chai.expect(appUnmountFunc0Args.getCurrentPathProps()).to.deep.equal(expectedUnmountProps);
        chai.expect(appUnmountFunc1Args.getCurrentPathProps()).to.deep.equal(expectedUnmountProps);
    });

    it('should dynamically render wrapped app after wrapper has been rendered', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        await bootstrap({ appId: 'wrappedApp__at__body' });

        const mountProps = { appId: 'wrappedApp__at__body', renderApp: () => {}, getCurrentPathProps: () => ({ propMount: 'value' }) };
        await mount(mountProps);

        const extraPropsFromWrapper = { propsFromWrapper: 'AAAA', fromClick: 1 };
        await mountProps.renderApp(extraPropsFromWrapper);

        expectCallbacksToBeCalled([
            wrapperCallbacksFake.bootstrap,
            wrapperCallbacksFake.mount,
            wrapperCallbacksFake.unmount,
            appCallbacksFake.bootstrap,
            appCallbacksFake.mount,
        ]);
    });

    it('should dynamically render wrapped app after wrapper has been rendered [arrayed callbacks]', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount } = wrapApp.wrapWith(appCallbacksFakeArray, wrapperCallbacksFakeArray);

        await bootstrap({ appId: 'wrappedApp__at__body' });

        const mountProps = { appId: 'wrappedApp__at__body', renderApp: () => {}, getCurrentPathProps: () => ({ propMount: 'value' }) };
        await mount(mountProps);

        const extraPropsFromWrapper = { propsFromWrapper: 'AAAA', fromClick: 1 };
        await mountProps.renderApp(extraPropsFromWrapper);

        expectCallbacksToBeCalled([
            ...wrapperCallbacksFakeArray.bootstrap,
            ...wrapperCallbacksFakeArray.mount,
            ...wrapperCallbacksFakeArray.unmount,
            ...appCallbacksFakeArray.bootstrap,
            ...appCallbacksFakeArray.mount,
        ]);
    });

    it('should correctly unmount wrapped app that has been rendered dynamically', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        await bootstrap({ appId: 'wrappedApp__at__body' });

        const mountProps = { appId: 'wrappedApp__at__body', renderApp: () => {}, getCurrentPathProps: () => ({ propMount: 'value' }) };
        await mount(mountProps);

        const extraPropsFromWrapper = { propsFromWrapper: 'AAAA', fromClick: 1 };
        await mountProps.renderApp(extraPropsFromWrapper);

        await unmount({ appId: 'wrappedApp__at__body', getCurrentPathProps: () => ({ propUnmount: 'value' }) });

        chai.expect(appCallbacksFake.unmount.called).to.be.true;
    });

    it('should correctly unmount wrapped app that has been rendered dynamically [arrayed callbacks]', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFakeArray, wrapperCallbacksFakeArray);

        await bootstrap({ appId: 'wrappedApp__at__body' });

        const mountProps = { appId: 'wrappedApp__at__body', renderApp: () => {}, getCurrentPathProps: () => ({ propMount: 'value' }) };
        await mount(mountProps);

        const extraPropsFromWrapper = { propsFromWrapper: 'AAAA', fromClick: 1 };
        await mountProps.renderApp(extraPropsFromWrapper);

        await unmount({ appId: 'wrappedApp__at__body', getCurrentPathProps: () => ({ propUnmount: 'value' }) });

        expectCallbacksToBeCalled(appCallbacksFakeArray.unmount);
    });

    it('should forward a correct appId upon dynamic mount/unmount of wrapped app', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        await bootstrap({ appId: 'wrappedApp__at__body' });

        const mountProps = { appId: 'wrappedApp__at__body', renderApp: () => {}, getCurrentPathProps: () => ({ propMount: 'value' }) };
        await mount(mountProps);

        const extraPropsFromWrapper = { propsFromWrapper: 'AAAA', fromClick: 1 };
        await mountProps.renderApp(extraPropsFromWrapper);

        await unmount({ appId: 'wrappedApp__at__body'} );

        const wrapperBootstrapFuncArgs = wrapperCallbacksFake.bootstrap.args[0][0];
        const wrapperMountFuncArgs = wrapperCallbacksFake.mount.args[0][0];
        const wrapperUnmountFuncArgs = wrapperCallbacksFake.unmount.args[0][0];

        const appBootstrapFuncArgs = appCallbacksFake.bootstrap.args[0][0];
        const appMountFuncArgs = appCallbacksFake.mount.args[0][0];
        const appUnmountFuncArgs = appCallbacksFake.unmount.args[0][0];

        const expectedWrapperAppId = 'wrapper__at__body';
        const expectedWrappedAppAppId = 'wrappedApp__at__body';

        chai.expect(wrapperBootstrapFuncArgs.appId).to.be.equal(expectedWrapperAppId);
        chai.expect(wrapperMountFuncArgs.appId).to.be.equal(expectedWrapperAppId);
        chai.expect(wrapperUnmountFuncArgs.appId).to.be.equal(expectedWrapperAppId);

        chai.expect(appBootstrapFuncArgs.appId).to.be.equal(expectedWrappedAppAppId);
        chai.expect(appMountFuncArgs.appId).to.be.equal(expectedWrappedAppAppId);
        chai.expect(appUnmountFuncArgs.appId).to.be.equal(expectedWrappedAppAppId);
    });

    it('should forward a correct appId upon dynamic mount/unmount of wrapped app [arrayed callbacks]', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFakeArray, wrapperCallbacksFakeArray);

        await bootstrap({ appId: 'wrappedApp__at__body' });

        const mountProps = { appId: 'wrappedApp__at__body', renderApp: () => {}, getCurrentPathProps: () => ({ propMount: 'value' }) };
        await mount(mountProps);

        const extraPropsFromWrapper = { propsFromWrapper: 'AAAA', fromClick: 1 };
        await mountProps.renderApp(extraPropsFromWrapper);

        await unmount({ appId: 'wrappedApp__at__body'} );

        const wrapperBootstrapFunc0Args = wrapperCallbacksFakeArray.bootstrap[0].args[0][0];
        const wrapperBootstrapFunc1Args = wrapperCallbacksFakeArray.bootstrap[1].args[0][0];
        const wrapperMountFunc0Args = wrapperCallbacksFakeArray.mount[0].args[0][0];
        const wrapperMountFunc1Args = wrapperCallbacksFakeArray.mount[1].args[0][0];
        const wrapperUnmountFunc0Args = wrapperCallbacksFakeArray.unmount[0].args[0][0];
        const wrapperUnmountFunc1Args = wrapperCallbacksFakeArray.unmount[1].args[0][0];

        const appBootstrapFunc0Args = appCallbacksFakeArray.bootstrap[0].args[0][0];
        const appBootstrapFunc1Args = appCallbacksFakeArray.bootstrap[1].args[0][0];
        const appMountFunc0Args = appCallbacksFakeArray.bootstrap[0].args[0][0];
        const appMountFunc1Args = appCallbacksFakeArray.bootstrap[1].args[0][0];
        const appUnmountFunc0Args = appCallbacksFakeArray.unmount[0].args[0][0];
        const appUnmountFunc1Args = appCallbacksFakeArray.unmount[1].args[0][0];

        const expectedWrapperAppId = 'wrapper__at__body';
        const expectedWrappedAppAppId = 'wrappedApp__at__body';

        chai.expect(wrapperBootstrapFunc0Args.appId).to.be.equal(expectedWrapperAppId);
        chai.expect(wrapperBootstrapFunc1Args.appId).to.be.equal(expectedWrapperAppId);
        chai.expect(wrapperMountFunc0Args.appId).to.be.equal(expectedWrapperAppId);
        chai.expect(wrapperMountFunc1Args.appId).to.be.equal(expectedWrapperAppId);
        chai.expect(wrapperUnmountFunc0Args.appId).to.be.equal(expectedWrapperAppId);
        chai.expect(wrapperUnmountFunc1Args.appId).to.be.equal(expectedWrapperAppId);

        chai.expect(appBootstrapFunc0Args.appId).to.be.equal(expectedWrappedAppAppId);
        chai.expect(appBootstrapFunc1Args.appId).to.be.equal(expectedWrappedAppAppId);
        chai.expect(appMountFunc0Args.appId).to.be.equal(expectedWrappedAppAppId);
        chai.expect(appMountFunc1Args.appId).to.be.equal(expectedWrappedAppAppId);
        chai.expect(appUnmountFunc0Args.appId).to.be.equal(expectedWrappedAppAppId);
        chai.expect(appUnmountFunc1Args.appId).to.be.equal(expectedWrappedAppAppId);
    });

    it('should forward a correct extra props provided upon dynamic render of wrapped app', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        await bootstrap({ appId: 'wrappedApp__at__body' });

        const mountProps = { appId: 'wrappedApp__at__body', renderApp: () => {}, getCurrentPathProps: () => ({ propMount: 'value' }) };
        await mount(mountProps);

        const extraPropsFromWrapper = { propsFromWrapper: 'AAAA', fromClick: 1 };
        await mountProps.renderApp(extraPropsFromWrapper);

        const appBootstrapFuncArgs = appCallbacksFake.bootstrap.args[0][0];
        const appMountFuncArgs = appCallbacksFake.mount.args[0][0];

        const expectedExtraPropsFromWrapper = { propsFromWrapper: 'AAAA', fromClick: 1, propMount: 'value' };

        chai.expect(appBootstrapFuncArgs.getCurrentPathProps()).to.deep.equal(expectedExtraPropsFromWrapper);
        chai.expect(appMountFuncArgs.getCurrentPathProps()).to.deep.equal(expectedExtraPropsFromWrapper);
    });

    it('should forward a correct extra props provided upon dynamic render of wrapped app [arrayed callbacks]', async () => {
        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount } = wrapApp.wrapWith(appCallbacksFakeArray, wrapperCallbacksFakeArray);

        await bootstrap({ appId: 'wrappedApp__at__body' });

        const mountProps = { appId: 'wrappedApp__at__body', renderApp: () => {}, getCurrentPathProps: () => ({ propMount: 'value' }) };
        await mount(mountProps);

        const extraPropsFromWrapper = { propsFromWrapper: 'AAAA', fromClick: 1 };
        await mountProps.renderApp(extraPropsFromWrapper);

        const appBootstrapFunc0Args = appCallbacksFakeArray.bootstrap[0].args[0][0];
        const appBootstrapFunc1Args = appCallbacksFakeArray.bootstrap[1].args[0][0];
        const appMountFunc0Args = appCallbacksFakeArray.mount[0].args[0][0];
        const appMountFunc1Args = appCallbacksFakeArray.mount[1].args[0][0];

        const expectedExtraPropsFromWrapper = { propsFromWrapper: 'AAAA', fromClick: 1, propMount: 'value' };

        chai.expect(appBootstrapFunc0Args.getCurrentPathProps()).to.deep.equal(expectedExtraPropsFromWrapper);
        chai.expect(appBootstrapFunc1Args.getCurrentPathProps()).to.deep.equal(expectedExtraPropsFromWrapper);
        chai.expect(appMountFunc0Args.getCurrentPathProps()).to.deep.equal(expectedExtraPropsFromWrapper);
        chai.expect(appMountFunc1Args.getCurrentPathProps()).to.deep.equal(expectedExtraPropsFromWrapper);
    });
});
