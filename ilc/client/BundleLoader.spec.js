import chai from 'chai';
import sinon from 'sinon';
chai.use(require('chai-as-promised'));
const expect = chai.expect;

import { getRegistryMock } from '../tests/helpers';

import { BundleLoader, emptyClientApplication } from './BundleLoader';
import { getIlcConfigRoot } from './configuration/getIlcConfigRoot';

const fnCallbacks = {
    bootstrap: async () => 'bootstrap',
    mount: async () => 'mount',
    unmount: async () => 'unmount',
};

describe('BundleLoader', () => {
    const SystemJs = {
        import: sinon.stub(),
        resolve: sinon.stub(),
        get: sinon.stub(),
        delete: sinon.stub(),
    };
    let registry;
    let registryConfigurationStub;
    const configRoot = getIlcConfigRoot();

    const mockFactoryFn = () => {};

    const sdkFactoryBuilder = {
        getSdkFactoryByApplicationName() {
            return mockFactoryFn;
        },
        getSdkAdapterInstance() {},
    };

    beforeEach(() => {
        registry = getRegistryMock({
            apps: {
                '@portal/primary': {
                    props: { prop1: 'hello' },
                },
                '@portal/withWrapper': {
                    spaBundle: 'http://localhost/withWrapper.js',
                    wrappedWith: '@portal/primary',
                },
                '@portal/ssrOnly': {
                    wrappedWith: '@portal/primary',
                },
                '@portal/appWithCss': {
                    spaBundle: 'http://localhost/index.js',
                    cssBundle: 'http://localhost/index.css',
                    kind: 'primary',
                },
            },
        }).getConfig();
        registryConfigurationStub = sinon.stub(configRoot, 'registryConfiguration').value(registry);
    });

    afterEach(() => {
        SystemJs.import.reset();
        registryConfigurationStub.restore();
    });

    describe('preloadApp()', () => {
        it('preloads app by spaBundle URL directly instead of name and ignores all errors', async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const appName = '@portal/primary';

            SystemJs.import.rejects();
            loader.preloadApp(appName);
            sinon.assert.calledWith(SystemJs.import, registry.apps[appName].spaBundle);
        });

        it('does not throw with ssr only app', async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const appName = '@portal/ssrOnly';
            SystemJs.import.resolves();

            loader.preloadApp(appName);
        });

        it("preloads app and it's wrapper", async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const appName = '@portal/withWrapper';

            SystemJs.import.rejects();

            loader.preloadApp(appName);
            const appInReg = registry.apps[appName];
            sinon.assert.calledWith(SystemJs.import, appInReg.spaBundle);
            sinon.assert.calledWith(SystemJs.import, registry.apps[appInReg.wrappedWith].spaBundle);
        });
    });

    describe('loadApp()', () => {
        it('loads ssr only app and returns callbacks mock from mainSpa', async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const appName = '@portal/ssrOnly';

            const callbacks = await loader.loadApp(appName);
            expect(callbacks).to.equal(emptyClientApplication);
        });

        it('loads app and returns callbacks from mainSpa and calls it once', async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const appName = '@portal/primary';

            const mainSpa = sinon.stub().returns(fnCallbacks);

            SystemJs.import.resolves({ mainSpa });

            const callbacks = await loader.loadApp(appName);
            expect(callbacks).to.equal(fnCallbacks);

            const callbacks2 = await loader.loadApp(appName);
            expect(callbacks2).to.equal(fnCallbacks);

            sinon.assert.calledWith(SystemJs.import, appName);
            sinon.assert.calledTwice(SystemJs.import);

            sinon.assert.calledOnce(mainSpa);
            sinon.assert.calledWith(mainSpa, registry.apps[appName].props);
        });
        it('loads app and returns callbacks from mainSpa and calls without cache', async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const appName = '@portal/primary';

            const mainSpa = sinon.stub().returns(fnCallbacks);

            const appBundle = { mainSpa };

            SystemJs.import.resolves(appBundle);
            SystemJs.resolve.returns('bundle.js');
            SystemJs.get.withArgs('bundle.js').returns(appBundle);
            SystemJs.delete.withArgs('bundle.js').returns({});

            const callbacks = await loader.loadApp(appName);
            expect(callbacks).to.equal(fnCallbacks);

            loader.unloadApp(appName);

            const callbacks2 = await loader.loadApp(appName, { cachedEnabled: false });
            expect(callbacks2).to.equal(fnCallbacks);

            sinon.assert.calledWith(SystemJs.import, appName);
            sinon.assert.calledTwice(SystemJs.import);

            sinon.assert.calledTwice(mainSpa);
            sinon.assert.calledWith(mainSpa, registry.apps[appName].props);
        });

        it('loads app and returns callbacks from mainSpa exported as default and calls it once', async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const appName = '@portal/primary';

            const mainSpa = sinon.stub().returns(fnCallbacks);

            SystemJs.import.resolves({ default: { mainSpa } });

            const callbacks = await loader.loadApp(appName);
            expect(callbacks).to.equal(fnCallbacks);

            const callbacks2 = await loader.loadApp(appName);
            expect(callbacks2).to.equal(fnCallbacks);

            sinon.assert.calledWith(SystemJs.import, appName);
            sinon.assert.calledTwice(SystemJs.import);

            sinon.assert.calledOnce(mainSpa);
            sinon.assert.calledWith(mainSpa, registry.apps[appName].props, { sdkFactory: mockFactoryFn });
        });

        it('loads app and returns callbacks', async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const appName = '@portal/primary';

            SystemJs.import.resolves(fnCallbacks);

            const callbacks = await loader.loadApp(appName);
            expect(callbacks).to.equal(fnCallbacks);

            sinon.assert.calledWith(SystemJs.import, appName);
        });

        it('loads app and returns callbacks from default export', async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const appName = '@portal/primary';

            SystemJs.import.resolves({ default: fnCallbacks });

            const callbacks = await loader.loadApp(appName);
            expect(callbacks).to.equal(fnCallbacks);
            sinon.assert.calledWith(SystemJs.import, appName);
        });
        it('should load CssTrackedApp by default', async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const appName = '@portal/appWithCss';

            SystemJs.import.resolves(fnCallbacks);

            const callbacks = await loader.loadApp(appName);
            expect(callbacks.__CSS_TRACKED_APP__).to.equal(true);

            sinon.assert.calledWith(SystemJs.import, appName);
        });
        it('should load pure app without css if flag set', async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const appName = '@portal/appWithCss';

            SystemJs.import.resolves(fnCallbacks);

            const callbacks = await loader.loadApp(appName, { injectGlobalCss: false });
            expect(callbacks.__CSS_TRACKED_APP__).to.equal(undefined);

            sinon.assert.calledWith(SystemJs.import, appName);
        });
    });

    describe('loadCss()', () => {
        it('loads CSS', async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const cssUrl = 'http://127.0.0.1/my.css';

            SystemJs.import.resolves('CSS');
            expect(await loader.loadCss(cssUrl)).to.eq('CSS');
            sinon.assert.calledWith(SystemJs.import, cssUrl);
        });

        it('loads CSS and ignores error caused by double loading', async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const cssUrl = 'http://127.0.0.1/my.css';

            SystemJs.import.rejects(new Error('has already been loaded using another way'));
            expect(loader.loadCss(cssUrl)).to.eventually.be.fulfilled;
        });

        it('loads CSS and forwards errors', async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const cssUrl = 'http://127.0.0.1/my.css';

            SystemJs.import.rejects(new Error('other err'));
            expect(loader.loadCss(cssUrl)).to.eventually.be.rejected;
        });
    });

    describe('loadAppWithCss()', () => {
        it('loads app without CSS bundle', async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const appName = '@portal/primary';

            SystemJs.import.resolves(fnCallbacks);

            const callbacks = await loader.loadAppWithCss(appName);
            expect(callbacks).to.equal(fnCallbacks);

            sinon.assert.calledWith(SystemJs.import, appName);
        });

        it('loads app with CSS bundle', async () => {
            const loader = new BundleLoader(configRoot, SystemJs, sdkFactoryBuilder);
            const appName = '@portal/appWithCss';

            SystemJs.import.resolves(fnCallbacks);

            const callbacks = await loader.loadAppWithCss(appName);
            Object.keys(fnCallbacks).forEach((key) => {
                expect(callbacks[key]).not.to.be.undefined;
            });

            sinon.assert.calledWith(SystemJs.import, appName);
            sinon.assert.calledWith(SystemJs.import, registry.apps[appName].cssBundle);
        });
    });
});
