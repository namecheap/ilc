import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';

chai.use(chaiAsPromised);
const expect = chai.expect;

import { getRegistryMock } from '../tests/helpers';

import ParcelApi from './ParcelApi';

const fnCallbacks = {
    bootstrap: async (props) => props,
    mount: async (props) => props,
    update: async (props) => props,
    unmount: async (props) => props,
};

describe('ParcelApi', () => {
    const bundleLoader = {
        loadAppWithCss: sinon.stub(),
    };
    const getAppSdkAdapter = () => ({ intl: undefined });
    let registry;

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
            },
        }).getConfig();
    });

    afterEach(() => {
        bundleLoader.loadAppWithCss.reset();
    });

    it('loads parcel from bundle and injects props to lifecycle functions', async () => {
        const parcelApi = new ParcelApi(registry, bundleLoader, getAppSdkAdapter);
        const appName = '@portal/primary';
        const parcelName = '@portal/primary';
        const parcelId = 'parcel0';

        bundleLoader.loadAppWithCss.resolves({ parcels: { [parcelName]: fnCallbacks } });
        const callbacks = await parcelApi.importParcelFromApp(appName, parcelName);

        for (const lifecycle of Object.keys(fnCallbacks)) {
            const receivedProps = await callbacks[lifecycle]({ name: parcelId });
            expect(receivedProps.parcelSdk).to.deep.include({
                parcelId,
                registryProps: registry.apps[appName].props,
            });
        }

        sinon.assert.calledWith(bundleLoader.loadAppWithCss, appName);
    });

    it('correctly handles case when same parcel was used twice and they receive different props', async () => {
        const parcelApi = new ParcelApi(registry, bundleLoader, getAppSdkAdapter);
        const appName = '@portal/primary';
        const parcelName = '@portal/primary';

        bundleLoader.loadAppWithCss.resolves({ parcels: { [parcelName]: fnCallbacks } });
        const callbacks = await parcelApi.importParcelFromApp(appName, parcelName);

        for (const parcelId of ['parcel0', 'parcel1']) {
            for (const lifecycle of ['bootstrap', 'mount', 'update']) {
                const receivedProps = await callbacks[lifecycle]({ name: parcelId });
                expect(receivedProps.parcelSdk).to.deep.include({
                    parcelId,
                    registryProps: registry.apps[appName].props,
                });
            }
        }
    });

    it("throw an error when asked to load app that doesn't exists in registry", async () => {
        const parcelApi = new ParcelApi(registry, bundleLoader, getAppSdkAdapter);

        expect(parcelApi.importParcelFromApp('@portal/nonExisting', 'na')).to.eventually.be.rejectedWith(
            /Unable to find requested app/,
        );
    });

    it("throw an error when asked to load app doesn't contains parcels", async () => {
        const parcelApi = new ParcelApi(registry, bundleLoader, getAppSdkAdapter);

        bundleLoader.loadAppWithCss.resolves({});

        expect(parcelApi.importParcelFromApp('@portal/primary', 'na')).to.eventually.be.rejectedWith(
            /doesn't export requested parcel/,
        );
    });
});
