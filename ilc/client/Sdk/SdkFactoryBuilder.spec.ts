import { expect } from 'chai';
import sinon, { type SinonStub, type SinonSpy } from 'sinon';
import { SdkFactoryBuilder } from './SdkFactoryBuilder';
import * as SdkAdapterFactoryModule from './SdkAdapterFactory';
import IlcAppSdk from 'ilc-sdk/app';

interface MockConfigRoot {
    getConfigForAppByName: SinonStub;
}

interface MockI18n {
    getAdapter: SinonStub;
}

interface MockRouter {
    render404: SinonSpy;
}

describe('SdkFactoryBuilder', () => {
    let mockConfigRoot: MockConfigRoot;
    let mockI18n: MockI18n;
    let mockRouter: MockRouter;
    let sdkAdapterFactoryStub: SinonStub;
    let mockSdkAdapter: any;

    beforeEach(() => {
        mockConfigRoot = {
            getConfigForAppByName: sinon.stub(),
        };

        mockI18n = {
            getAdapter: sinon.stub().returns({ locale: 'en-US', currency: 'USD' }),
        };

        mockRouter = {
            render404: sinon.spy(),
        };

        mockSdkAdapter = {
            appId: 'test',
            intl: { locale: 'en-US' },
            trigger404Page: sinon.spy(),
        };

        // Stub SdkAdapterFactory constructor and getSdkAdapter method
        sdkAdapterFactoryStub = sinon.stub(SdkAdapterFactoryModule, 'SdkAdapterFactory');
        sdkAdapterFactoryStub.returns({
            getSdkAdapter: sinon.stub().returns(mockSdkAdapter),
        });
    });

    afterEach(() => {
        sdkAdapterFactoryStub.restore();
        sinon.resetHistory();
    });

    describe('constructor', () => {
        it('should create an instance with configRoot, i18n, and router', () => {
            const builder = new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);
            expect(builder).to.be.instanceOf(SdkFactoryBuilder);
        });

        it('should create SdkAdapterFactory with i18n and router', () => {
            new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);
            expect(sdkAdapterFactoryStub.calledOnce).to.be.true;
            expect(sdkAdapterFactoryStub.calledWith(mockI18n, mockRouter)).to.be.true;
        });

        it('should handle null i18n', () => {
            const builder = new SdkFactoryBuilder(mockConfigRoot, null, mockRouter);
            expect(builder).to.be.instanceOf(SdkFactoryBuilder);
            expect(sdkAdapterFactoryStub.calledWith(null, mockRouter)).to.be.true;
        });

        it('should handle undefined i18n', () => {
            const builder = new SdkFactoryBuilder(mockConfigRoot, undefined, mockRouter);
            expect(builder).to.be.instanceOf(SdkFactoryBuilder);
            expect(sdkAdapterFactoryStub.calledWith(undefined, mockRouter)).to.be.true;
        });
    });

    describe('getSdkFactoryByApplicationName', () => {
        it('should return a factory function', () => {
            mockConfigRoot.getConfigForAppByName.returns({
                l10nManifest: '/manifest.json',
                cssBundle: '/app.css',
            });

            const builder = new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);
            const factory = builder.getSdkFactoryByApplicationName('testApp');

            expect(factory).to.be.a('function');
        });

        it('should call getConfigForAppByName with correct application name', () => {
            mockConfigRoot.getConfigForAppByName.returns({
                l10nManifest: '/manifest.json',
                cssBundle: '/app.css',
            });

            const builder = new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);
            builder.getSdkFactoryByApplicationName('testApp');

            expect(mockConfigRoot.getConfigForAppByName.calledOnce).to.be.true;
            expect(mockConfigRoot.getConfigForAppByName.calledWith('testApp')).to.be.true;
        });

        it('should create SDK factory with l10nManifest and cssBundle when both are provided', () => {
            mockConfigRoot.getConfigForAppByName.returns({
                l10nManifest: '/manifest.json',
                cssBundle: '/app.css',
            });

            const builder = new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);
            const factory = builder.getSdkFactoryByApplicationName('testApp');
            const sdk = factory('testApp__at__testSlot');

            expect(sdk).to.be.instanceOf(IlcAppSdk);
        });

        it('should handle app config without l10nManifest', () => {
            mockConfigRoot.getConfigForAppByName.returns({
                cssBundle: '/app.css',
            });

            const builder = new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);
            const factory = builder.getSdkFactoryByApplicationName('testApp');
            const sdk = factory('testApp__at__testSlot');

            expect(sdk).to.be.instanceOf(IlcAppSdk);
        });

        it('should handle app config without cssBundle', () => {
            mockConfigRoot.getConfigForAppByName.returns({
                l10nManifest: '/manifest.json',
            });

            const builder = new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);
            const factory = builder.getSdkFactoryByApplicationName('testApp');
            const sdk = factory('testApp__at__testSlot');

            expect(sdk).to.be.instanceOf(IlcAppSdk);
        });

        it('should handle app config without l10nManifest and cssBundle', () => {
            mockConfigRoot.getConfigForAppByName.returns({
                name: 'testApp',
                spaBundle: '/app.js',
            });

            const builder = new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);
            const factory = builder.getSdkFactoryByApplicationName('testApp');
            const sdk = factory('testApp__at__testSlot');

            expect(sdk).to.be.instanceOf(IlcAppSdk);
        });

        it('should handle null app config', () => {
            mockConfigRoot.getConfigForAppByName.returns(null);

            const builder = new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);
            const factory = builder.getSdkFactoryByApplicationName('testApp');
            const sdk = factory('testApp__at__testSlot');

            expect(sdk).to.be.instanceOf(IlcAppSdk);
        });

        it('should handle undefined app config', () => {
            mockConfigRoot.getConfigForAppByName.returns(undefined);

            const builder = new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);
            const factory = builder.getSdkFactoryByApplicationName('testApp');
            const sdk = factory('testApp__at__testSlot');

            expect(sdk).to.be.instanceOf(IlcAppSdk);
        });

        it('should create different factory functions for different applications', () => {
            mockConfigRoot.getConfigForAppByName.withArgs('app1').returns({
                l10nManifest: '/manifest1.json',
                cssBundle: '/app1.css',
            });
            mockConfigRoot.getConfigForAppByName.withArgs('app2').returns({
                l10nManifest: '/manifest2.json',
                cssBundle: '/app2.css',
            });

            const builder = new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);
            const factory1 = builder.getSdkFactoryByApplicationName('app1');
            const factory2 = builder.getSdkFactoryByApplicationName('app2');

            expect(factory1).to.not.equal(factory2);
            expect(mockConfigRoot.getConfigForAppByName.calledTwice).to.be.true;
        });

        it('should create SDK instances with correct application ID', () => {
            mockConfigRoot.getConfigForAppByName.returns({
                l10nManifest: '/manifest.json',
                cssBundle: '/app.css',
            });

            const builder = new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);
            const factory = builder.getSdkFactoryByApplicationName('testApp');

            const sdk1 = factory('app1__at__slot1');
            const sdk2 = factory('app2__at__slot2');

            expect(sdk1).to.be.instanceOf(IlcAppSdk);
            expect(sdk2).to.be.instanceOf(IlcAppSdk);
        });

        it('should use getSdkAdapterInstance when creating SDK', () => {
            mockConfigRoot.getConfigForAppByName.returns({
                l10nManifest: '/manifest.json',
                cssBundle: '/app.css',
            });

            const builder = new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);
            const getSdkAdapterInstanceSpy = sinon.spy(builder, 'getSdkAdapterInstance');

            const factory = builder.getSdkFactoryByApplicationName('testApp');
            const appId = 'testApp__at__testSlot';
            factory(appId);

            expect(getSdkAdapterInstanceSpy.calledOnce).to.be.true;
            expect(getSdkAdapterInstanceSpy.calledWith(appId)).to.be.true;

            getSdkAdapterInstanceSpy.restore();
        });
    });

    describe('getSdkAdapterInstance', () => {
        it('should return SDK adapter from SdkAdapterFactory', () => {
            const builder = new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = builder.getSdkAdapterInstance(appId);

            expect(adapter).to.equal(mockSdkAdapter);
        });

        it('should delegate to SdkAdapterFactory.getSdkAdapter', () => {
            const builder = new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);
            const appId = 'testApp__at__testSlot';

            const adapter = builder.getSdkAdapterInstance(appId);

            // Verify it returns the mock adapter we configured
            expect(adapter).to.exist;
            expect(adapter).to.equal(mockSdkAdapter);
        });

        it('should work with different application IDs', () => {
            const builder = new SdkFactoryBuilder(mockConfigRoot, mockI18n, mockRouter);

            const adapter1 = builder.getSdkAdapterInstance('app1__at__slot1');
            const adapter2 = builder.getSdkAdapterInstance('app2__at__slot2');

            // Both should return adapters (even if they're the same mock in this test)
            expect(adapter1).to.exist;
            expect(adapter2).to.exist;
        });
    });
});
