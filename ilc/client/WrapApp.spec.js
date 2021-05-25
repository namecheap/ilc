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

    /**
     * Init fake <script type="ilc-config">...</script>
     * @param {Object} config
     */
    function initFakeIlcConfig(config) {
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
        const slotEl = document.createElement('div');
        slotEl.id = name;
        document.body.appendChild(slotEl);
    }

    initFakeIlcConfig({});
    initFakeSlot('body');

    afterEach(() => {
       Object.keys(appCallbacksFake).forEach((key) => appCallbacksFake[key].resetHistory());
       Object.keys(wrapperCallbacksFake).forEach((key) => wrapperCallbacksFake[key].resetHistory());
    });

    it('should mount wrapper when no ssr overrides provided', async () => {

        // Initialisation

        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        // Execution

        await bootstrap({ appId: 'wrappedApp__at__body' });
        await mount({ appId: 'wrappedApp__at__body' });
        await unmount({ appId: 'wrappedApp__at__body' });

        // Execution results extracting

        const wrapperBootstrapFuncCalledArgs = wrapperCallbacksFake.bootstrap.args[0][0];
        const wrapperMountFuncCalledArgs = wrapperCallbacksFake.mount.args[0][0];
        const wrapperUnmountFuncCalledArgs = wrapperCallbacksFake.unmount.args[0][0];

        const currentBootstrapPathProps = wrapperBootstrapFuncCalledArgs.getCurrentPathProps();
        const currentBootstrapBasePath = wrapperBootstrapFuncCalledArgs.getCurrentBasePath();

        const currentMountPathProps = wrapperMountFuncCalledArgs.getCurrentPathProps();
        const currentMountBasePath = wrapperMountFuncCalledArgs.getCurrentBasePath();

        const currentUnmountPathProps = wrapperUnmountFuncCalledArgs.getCurrentPathProps();
        const currentUnmountBasePath = wrapperUnmountFuncCalledArgs.getCurrentBasePath();

        // Expectations

        const expectedBootstrapAppId = 'wrapper__at__body';
        const expectedBootstrapPathProps = { prop: 'value' };
        const expectedBootstrapCurrentBasePath = '/';

        const expectedMountAppId = 'wrapper__at__body';
        const expectedMountPathProps = { prop: 'value' };
        const expectedMountCurrentBasePath = '/';

        const expectedUnmountAppId = 'wrapper__at__body';
        const expectedUnmountPathProps = { prop: 'value' };
        const expectedUnmountCurrentBasePath = '/';

        chai.expect(appCallbacksFake.bootstrap.called).to.be.false;
        chai.expect(appCallbacksFake.mount.called).to.be.false;
        chai.expect(appCallbacksFake.unmount.called).to.be.false;

        chai.expect(wrapperCallbacksFake.bootstrap.called).to.be.true;
        chai.expect(wrapperBootstrapFuncCalledArgs.appId).to.be.equal(expectedBootstrapAppId);
        chai.expect(currentBootstrapPathProps).to.deep.equal(expectedBootstrapPathProps);
        chai.expect(currentBootstrapBasePath).to.be.equal(expectedBootstrapCurrentBasePath);

        chai.expect(wrapperCallbacksFake.mount.called).to.be.true;
        chai.expect(wrapperMountFuncCalledArgs.appId).to.be.equal(expectedMountAppId);
        chai.expect(currentMountPathProps).to.deep.equal(expectedMountPathProps);
        chai.expect(currentMountBasePath).to.be.equal(expectedMountCurrentBasePath);

        chai.expect(wrapperCallbacksFake.unmount.called).to.be.true;
        chai.expect(wrapperUnmountFuncCalledArgs.appId).to.be.equal(expectedUnmountAppId);
        chai.expect(currentUnmountPathProps).to.deep.equal(expectedUnmountPathProps);
        chai.expect(currentUnmountBasePath).to.be.equal(expectedUnmountCurrentBasePath);
    });

    it('should mount wrapped application when ssr overrides provided', async () => {

        // Initialisation

        const wrapApp = new WrapApp(
            { appId: 'wrapper__at__body', kind: 'wrapper', spaBundle: 'http://localhost/client-entry.js', props: { prop: 'value' } },
            { fromLocation: 1, propFromWrapper: 'AAAAA' },
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        // Execution

        await bootstrap({ getCurrentPathProps: () => ({ pathBootstrapProp: 'path-prop-value' }), appId: 'wrappedApp__at__body' });
        await mount({ getCurrentPathProps: () => ({ pathMountProp: 'path-prop-value' }), appId: 'wrappedApp__at__body' });
        await unmount({ getCurrentPathProps: () => ({ pathUnmountProp: 'path-prop-value' }), appId: 'wrappedApp__at__body' });

        // Execution results extracting

        const appBootstrapFuncCalledArgs = appCallbacksFake.bootstrap.args[0][0];
        const appMountFuncCalledArgs = appCallbacksFake.mount.args[0][0];
        const appUnmountFuncCalledArgs = appCallbacksFake.unmount.args[0][0];

        const currentBootstrapPathProps = appBootstrapFuncCalledArgs.getCurrentPathProps();

        const currentMountPathProps = appMountFuncCalledArgs.getCurrentPathProps();

        const currentUnmountPathProps = appUnmountFuncCalledArgs.getCurrentPathProps();

        // Expectations

        const expectedBootstrapAppId = 'wrappedApp__at__body';
        const expectedBootstrapPathProps = { pathBootstrapProp: 'path-prop-value' };

        const expectedMountAppId = 'wrappedApp__at__body';
        const expectedMountPathProps = { pathMountProp: 'path-prop-value' };

        const expectedUnmountAppId = 'wrappedApp__at__body';
        const expectedUnmountPathProps = { pathUnmountProp: 'path-prop-value' };

        chai.expect(wrapperCallbacksFake.bootstrap.called).to.be.false;
        chai.expect(wrapperCallbacksFake.mount.called).to.be.false;
        chai.expect(wrapperCallbacksFake.unmount.called).to.be.false;

        chai.expect(appCallbacksFake.bootstrap.called).to.be.true;
        chai.expect(appBootstrapFuncCalledArgs.appId).to.be.equal(expectedBootstrapAppId);
        chai.expect(currentBootstrapPathProps).to.deep.equal(expectedBootstrapPathProps);

        chai.expect(appCallbacksFake.mount.called).to.be.true;
        chai.expect(appMountFuncCalledArgs.appId).to.be.equal(expectedMountAppId);
        chai.expect(currentMountPathProps).to.deep.equal(expectedMountPathProps);

        chai.expect(appCallbacksFake.unmount.called).to.be.true;
        chai.expect(appUnmountFuncCalledArgs.appId).to.be.equal(expectedUnmountAppId);
        chai.expect(currentUnmountPathProps).to.deep.equal(expectedUnmountPathProps);
    });

    it('should mount wrapper and then wrapped application with extra props', async () => {
        // Initialisation

        const wrapApp = new WrapApp(
            { spaBundle: 'http://localhost/client-entry.js', kind: 'wrapper', appId: 'wrapper__at__body', props: { prop: 'value' } },
            null,
        );

        const { bootstrap, mount, unmount } = wrapApp.wrapWith(appCallbacksFake, wrapperCallbacksFake);

        // Execution & expectations

        await bootstrap({ appId: 'wrappedApp__at__body' });

        const mountProps = { appId: 'wrappedApp__at__body', renderApp: () => {}, getCurrentPathProps: () => ({ propMount: 'value' }) };
        await mount(mountProps);

        chai.expect(wrapperCallbacksFake.bootstrap.called).to.be.true;
        chai.expect(wrapperCallbacksFake.mount.called).to.be.true;
        chai.expect(wrapperCallbacksFake.unmount.called).to.be.false;

        chai.expect(appCallbacksFake.bootstrap.called).to.be.false;
        chai.expect(appCallbacksFake.mount.called).to.be.false;
        chai.expect(appCallbacksFake.unmount.called).to.be.false;

        const extraPropsFromWrapper = { propsFromWrapper: 'AAAA', fromClick: 1 };
        await mountProps.renderApp(extraPropsFromWrapper);

        chai.expect(wrapperCallbacksFake.unmount.called).to.be.true;
        chai.expect(appCallbacksFake.bootstrap.called).to.be.true;
        chai.expect(appCallbacksFake.mount.called).to.be.true;
        chai.expect(appCallbacksFake.unmount.called).to.be.false;

        await unmount({ appId: 'wrappedApp__at__body', getCurrentPathProps: () => ({ propUnmount: 'value' }) });

        chai.expect(appCallbacksFake.unmount.called).to.be.true;

        const wrapperBootstrapFuncCalledArgs = wrapperCallbacksFake.bootstrap.args[0][0];
        const wrapperMountFuncCalledArgs = wrapperCallbacksFake.mount.args[0][0];
        const wrapperUnmountFuncCalledArgs = wrapperCallbacksFake.unmount.args[0][0];

        const appBootstrapFuncCalledArgs = appCallbacksFake.bootstrap.args[0][0];
        const appMountFuncCalledArgs = appCallbacksFake.mount.args[0][0];
        const appUnmountFuncCalledArgs = appCallbacksFake.unmount.args[0][0];

        const currentWrapperBootstrapPathProps = wrapperBootstrapFuncCalledArgs.getCurrentPathProps();
        const currentWrapperBootstrapBasePath = wrapperBootstrapFuncCalledArgs.getCurrentBasePath();

        const currentWrapperMountPathProps = wrapperMountFuncCalledArgs.getCurrentPathProps();
        const currentWrapperMountBasePath = wrapperMountFuncCalledArgs.getCurrentBasePath();

        const currentWrapperUnmountPathProps = wrapperUnmountFuncCalledArgs.getCurrentPathProps();
        const currentWrapperUnmountBasePath = wrapperUnmountFuncCalledArgs.getCurrentBasePath();

        const currentAppBootstrapPathProps = appBootstrapFuncCalledArgs.getCurrentPathProps();
        const currentAppMountPathProps = appMountFuncCalledArgs.getCurrentPathProps();
        const currentAppUnmountPathProps = appUnmountFuncCalledArgs.getCurrentPathProps();

        const expectedWrapperBootstrapAppId = 'wrapper__at__body';
        const expectedWrapperBootstrapPathProps = { prop: 'value' };
        const expectedWrapperBootstrapBasePath = '/';

        const expectedWrapperMountAppId = 'wrapper__at__body';
        const expectedWrapperMountPathProps = { prop: 'value' };
        const expectedWrapperMountBasePath = '/';

        const expectedWrapperUnmountAppId = 'wrapper__at__body';
        const expectedWrapperUnmountPathProps = { prop: 'value' };
        const expectedWrapperUnmountBasePath = '/';

        const expectedAppBootstrapAppId = 'wrappedApp__at__body';
        const expectedAppBootstrapPathProps = { propMount: 'value' };

        const expectedAppMountAppId = 'wrappedApp__at__body';
        const expectedAppMountPathProps = { propMount: 'value' };

        const expectedAppUnmountAppId = 'wrappedApp__at__body';
        const expectedAppUnmountPathProps = { propUnmount: 'value' };

        chai.expect(wrapperBootstrapFuncCalledArgs.appId).to.be.equal(expectedWrapperBootstrapAppId);
        chai.expect(currentWrapperBootstrapPathProps).to.deep.equal(expectedWrapperBootstrapPathProps);
        chai.expect(currentWrapperBootstrapBasePath).to.be.equal(expectedWrapperBootstrapBasePath);

        chai.expect(wrapperMountFuncCalledArgs.appId).to.be.equal(expectedWrapperMountAppId);
        chai.expect(currentWrapperMountPathProps).to.deep.equal(expectedWrapperMountPathProps);
        chai.expect(currentWrapperMountBasePath).to.be.equal(expectedWrapperMountBasePath);

        chai.expect(wrapperUnmountFuncCalledArgs.appId).to.be.equal(expectedWrapperUnmountAppId);
        chai.expect(currentWrapperUnmountPathProps).to.deep.equal(expectedWrapperUnmountPathProps);
        chai.expect(currentWrapperUnmountBasePath).to.be.equal(expectedWrapperUnmountBasePath);

        chai.expect(appBootstrapFuncCalledArgs.appId).to.be.equal(expectedAppBootstrapAppId);
        chai.expect(currentAppBootstrapPathProps).to.deep.equal(expectedAppBootstrapPathProps);

        chai.expect(appMountFuncCalledArgs.appId).to.be.equal(expectedAppMountAppId);
        chai.expect(currentAppMountPathProps).to.deep.equal(expectedAppMountPathProps);

        chai.expect(appUnmountFuncCalledArgs.appId).to.be.equal(expectedAppUnmountAppId);
        chai.expect(currentAppUnmountPathProps).to.deep.equal(expectedAppUnmountPathProps);
    });
});
