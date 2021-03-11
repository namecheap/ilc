import chai from 'chai';
import sinon from 'sinon';
chai.use(require('chai-as-promised'));
const expect = chai.expect;

import { getRegistryMock } from '../tests/helpers'

import { BundleLoader } from './BundleLoader';

const fnCallbacks = {
    bootstrap: async () => 'bootstrap',
    mount: async () => 'mount',
    unmount: async () => 'unmount',
};

describe('BundleLoader', () => {
    const SystemJs = {
        import: sinon.stub(),
    };
    let registry;

    beforeEach(() => {
        registry = getRegistryMock({
            apps: {
                '@portal/primary': {
                    props: {prop1: 'hello'}
                },
                '@portal/withWrapper': {
                    spaBundle: 'http://localhost/withWrapper.js',
                    wrappedWith: '@portal/primary'
                },
            }
        }).getConfig().data;
    })

    afterEach(() => {
        SystemJs.import.reset();
    });

    describe('preloadApp()', () => {
        it('preloads app by spaBundle URL directly instead of name and ignores all errors', async () => {
            const loader = new BundleLoader(registry, SystemJs);
            const appName = '@portal/primary';

            SystemJs.import.rejects();
            loader.preloadApp(appName);
            sinon.assert.calledWith(SystemJs.import, registry.apps[appName].spaBundle);
        });

        it('preloads app and it\'s wrapper', async () => {
            const loader = new BundleLoader(registry, SystemJs);
            const appName = '@portal/withWrapper';

            SystemJs.import.rejects();

            loader.preloadApp(appName);
            const appInReg = registry.apps[appName];
            sinon.assert.calledWith(SystemJs.import, appInReg.spaBundle);
            sinon.assert.calledWith(SystemJs.import, registry.apps[appInReg.wrappedWith].spaBundle);
        });
    });

    describe('loadApp()', () => {
        it('loads app and returns callbacks from mainSpa and calls it once', async () => {
            const loader = new BundleLoader(registry, SystemJs);
            const appName = '@portal/primary';

            const mainSpa = sinon.stub().returns(fnCallbacks);

            SystemJs.import.resolves({mainSpa});

            const callbacks = await loader.loadApp(appName);
            expect(callbacks).to.equal(fnCallbacks);


            const callbacks2 = await loader.loadApp(appName);
            expect(callbacks2).to.equal(fnCallbacks);

            sinon.assert.calledWith(SystemJs.import, appName);
            sinon.assert.calledTwice(SystemJs.import);

            sinon.assert.calledOnce(mainSpa);
            sinon.assert.calledWith(mainSpa, registry.apps[appName].props);
        });

        it('loads app and returns callbacks from mainSpa exported as default and calls it once', async () => {
            const loader = new BundleLoader(registry, SystemJs);
            const appName = '@portal/primary';

            const mainSpa = sinon.stub().returns(fnCallbacks);

            SystemJs.import.resolves({default: {mainSpa}});

            const callbacks = await loader.loadApp(appName);
            expect(callbacks).to.equal(fnCallbacks);


            const callbacks2 = await loader.loadApp(appName);
            expect(callbacks2).to.equal(fnCallbacks);

            sinon.assert.calledWith(SystemJs.import, appName);
            sinon.assert.calledTwice(SystemJs.import);

            sinon.assert.calledOnce(mainSpa);
            sinon.assert.calledWith(mainSpa, registry.apps[appName].props);
        });

        it('loads app and returns callbacks', async () => {
            const loader = new BundleLoader(registry, SystemJs);
            const appName = '@portal/primary';

            SystemJs.import.resolves(fnCallbacks);

            const callbacks = await loader.loadApp(appName);
            expect(callbacks).to.equal(fnCallbacks);

            sinon.assert.calledWith(SystemJs.import, appName);
        });
    });

    describe('loadCss()', () => {
        it('loads CSS', async () => {
            const loader = new BundleLoader(registry, SystemJs);
            const cssUrl = 'http://127.0.0.1/my.css';

            SystemJs.import.resolves('CSS');
            expect(await loader.loadCss(cssUrl)).to.eq('CSS');
            sinon.assert.calledWith(SystemJs.import, cssUrl);
        });

        it('loads CSS and ignores error caused by double loading', async () => {
            const loader = new BundleLoader(registry, SystemJs);
            const cssUrl = 'http://127.0.0.1/my.css';

            SystemJs.import.rejects(new Error('has already been loaded using another way'));
            expect(loader.loadCss(cssUrl)).to.eventually.be.fulfilled;
        });

        it('loads CSS and forwards errors', async () => {
            const loader = new BundleLoader(registry, SystemJs);
            const cssUrl = 'http://127.0.0.1/my.css';

            SystemJs.import.rejects(new Error('other err'));
            expect(loader.loadCss(cssUrl)).to.eventually.be.rejected;
        });
    });

});
