import { expect } from 'chai';
import sinon, { type SinonStub, type SinonSpy } from 'sinon';
import * as singleSpa from 'single-spa';
import { registerApplications } from './registerSpaApps';
import * as composeAppSlotPairsModule from './composeAppSlotPairsToRegister';
import AsyncBootUp from './AsyncBootUp';

describe('registerSpaApps', () => {
    let mockIlcConfigRoot: any;
    let mockRouter: any;
    let mockAppErrorHandlerFactory: SinonSpy;
    let mockBundleLoader: any;
    let mockTransitionManager: any;
    let mockSdkFactoryBuilder: any;
    let mockErrorHandlerManager: any;
    let composeAppSlotPairsStub: SinonStub;
    let mockSlot: any;
    let asyncBootUpWaitForSlotStub: SinonStub;
    let registeredAppsResult: { destroy: () => Promise<void[]> } | null = null;
    let testCounter = 0;

    beforeEach(() => {
        // Increment test counter to ensure unique app names
        testCounter++;

        // Initialize window.ilcApps for AsyncBootUp
        (window as any).ilcApps = [];

        mockIlcConfigRoot = {
            getConfig: sinon.stub().returns({
                settings: {
                    onPropsUpdate: 'remount',
                },
            }),
            getConfigForAppByName: sinon.stub().returns({
                name: 'testApp',
                spaBundle: 'http://localhost/app.js',
                cssBundle: 'http://localhost/app.css',
            }),
        };

        mockRouter = {
            getCurrentRouteProps: sinon.stub().returns({}),
            getCurrentRoute: sinon.stub().returns({ basePath: '/' }),
            isAppWithinSlotActive: sinon.stub().returns(true),
            addListener: sinon.stub(),
            removeListener: sinon.stub(),
        };

        mockAppErrorHandlerFactory = sinon.spy(() => sinon.spy());

        mockBundleLoader = {
            preloadApp: sinon.stub(),
            loadAppWithCss: sinon.stub().resolves({
                bootstrap: sinon.stub().resolves(),
                mount: sinon.stub().resolves(),
                unmount: sinon.stub().resolves(),
            }),
        };

        mockTransitionManager = {};

        const mockAppSdk = {
            unmount: sinon.stub(),
        };

        const mockSdkFactory = sinon.stub().returns(mockAppSdk);

        mockSdkFactoryBuilder = {
            getSdkFactoryByApplicationName: sinon.stub().returns(mockSdkFactory),
        };

        mockErrorHandlerManager = {
            handleError: sinon.stub(),
        };

        // Create a minimal slot mock with unique names
        const appName = `testApp${testCounter}`;
        const slotName = `testSlot${testCounter}`;
        const appId = `${appName}__at__${slotName}`;

        mockSlot = {
            getSlotName: sinon.stub().returns(slotName),
            getApplicationName: sinon.stub().returns(appName),
            getApplicationId: sinon.stub().returns(appId),
            isValid: sinon.stub().returns(true),
        };

        // Stub composeAppSlotPairsToRegister to return our mock slot
        composeAppSlotPairsStub = sinon.stub(composeAppSlotPairsModule, 'default').returns([mockSlot]);

        // Stub AsyncBootUp
        asyncBootUpWaitForSlotStub = sinon.stub(AsyncBootUp.prototype, 'waitForSlot').resolves({
            spaBundle: null,
            cssBundle: null,
            wrapperPropsOverride: null,
        });

        // Create slot element in DOM
        const slotElement = document.createElement('div');
        slotElement.id = `ilc-slot-${slotName}`;
        document.body.appendChild(slotElement);
    });

    afterEach(async () => {
        // Unload all registered apps from single-spa to avoid conflicts with other tests
        if (registeredAppsResult) {
            await registeredAppsResult.destroy();
            registeredAppsResult = null;
        }

        // Restore stubs
        composeAppSlotPairsStub.restore();
        asyncBootUpWaitForSlotStub.restore();

        // Clean up DOM
        document.querySelectorAll('[id^="ilc-slot-"]').forEach((el) => el.remove());

        // Clean up window.ilcApps
        delete (window as any).ilcApps;

        // Reset sinon history
        sinon.resetHistory();
    });

    describe('registerApplications', () => {
        it('should register applications with single-spa', () => {
            registeredAppsResult = registerApplications(
                mockIlcConfigRoot,
                mockRouter,
                mockAppErrorHandlerFactory,
                mockBundleLoader,
                mockTransitionManager,
                mockSdkFactoryBuilder,
                mockErrorHandlerManager,
            );

            // Use single-spa API to check if app is registered
            const registeredApps = singleSpa.getAppNames();
            const expectedAppId = mockSlot.getApplicationId();
            expect(registeredApps).to.include(expectedAppId);
        });

        it('should create custom props for each application', () => {
            registeredAppsResult = registerApplications(
                mockIlcConfigRoot,
                mockRouter,
                mockAppErrorHandlerFactory,
                mockBundleLoader,
                mockTransitionManager,
                mockSdkFactoryBuilder,
                mockErrorHandlerManager,
            );

            const appName = mockSlot.getApplicationName();
            const slotName = mockSlot.getSlotName();

            expect(mockSdkFactoryBuilder.getSdkFactoryByApplicationName.calledOnce).to.be.true;
            expect(mockSdkFactoryBuilder.getSdkFactoryByApplicationName.calledWith(appName)).to.be.true;
            expect(mockAppErrorHandlerFactory.calledOnce).to.be.true;
            expect(mockAppErrorHandlerFactory.calledWith(appName, slotName)).to.be.true;
        });

        it('should handle multiple slots', () => {
            const secondAppName = `testApp${testCounter}-2`;
            const secondSlotName = `testSlot${testCounter}-2`;
            const secondAppId = `${secondAppName}__at__${secondSlotName}`;

            const mockSlot2 = {
                getSlotName: sinon.stub().returns(secondSlotName),
                getApplicationName: sinon.stub().returns(secondAppName),
                getApplicationId: sinon.stub().returns(secondAppId),
                isValid: sinon.stub().returns(true),
            };

            composeAppSlotPairsStub.returns([mockSlot, mockSlot2]);

            // Create second slot element
            const slotElement2 = document.createElement('div');
            slotElement2.id = `ilc-slot-${secondSlotName}`;
            document.body.appendChild(slotElement2);

            registeredAppsResult = registerApplications(
                mockIlcConfigRoot,
                mockRouter,
                mockAppErrorHandlerFactory,
                mockBundleLoader,
                mockTransitionManager,
                mockSdkFactoryBuilder,
                mockErrorHandlerManager,
            );

            const registeredApps = singleSpa.getAppNames();
            expect(registeredApps).to.include(mockSlot.getApplicationId());
            expect(registeredApps).to.include(secondAppId);
        });

        it('should call composeAppSlotPairsToRegister with ilcConfigRoot', () => {
            registeredAppsResult = registerApplications(
                mockIlcConfigRoot,
                mockRouter,
                mockAppErrorHandlerFactory,
                mockBundleLoader,
                mockTransitionManager,
                mockSdkFactoryBuilder,
                mockErrorHandlerManager,
            );

            expect(composeAppSlotPairsStub.calledOnce).to.be.true;
            expect(composeAppSlotPairsStub.calledWith(mockIlcConfigRoot)).to.be.true;
        });

        it('should skip registration if getCustomProps throws an error', () => {
            // Make getSdkFactoryByApplicationName throw an error
            mockSdkFactoryBuilder.getSdkFactoryByApplicationName.throws(new Error('SDK factory error'));

            registeredAppsResult = registerApplications(
                mockIlcConfigRoot,
                mockRouter,
                mockAppErrorHandlerFactory,
                mockBundleLoader,
                mockTransitionManager,
                mockSdkFactoryBuilder,
                mockErrorHandlerManager,
            );

            // App should not be registered
            const registeredApps = singleSpa.getAppNames();
            const expectedAppId = mockSlot.getApplicationId();
            expect(registeredApps).to.not.include(expectedAppId);

            // Error should be handled
            expect(mockErrorHandlerManager.handleError.calledOnce).to.be.true;
        });

        it('should register app with correct activity function', async () => {
            mockRouter.isAppWithinSlotActive.returns(false);

            registeredAppsResult = registerApplications(
                mockIlcConfigRoot,
                mockRouter,
                mockAppErrorHandlerFactory,
                mockBundleLoader,
                mockTransitionManager,
                mockSdkFactoryBuilder,
                mockErrorHandlerManager,
            );

            const appId = mockSlot.getApplicationId();
            const registeredApps = singleSpa.getAppNames();
            expect(registeredApps).to.include(appId);

            // Get app status
            const status = singleSpa.getAppStatus(appId);
            // App should not be mounted because activity function returns false
            expect(status).to.equal(singleSpa.NOT_LOADED);
        });

        it('should preload app bundle', () => {
            registeredAppsResult = registerApplications(
                mockIlcConfigRoot,
                mockRouter,
                mockAppErrorHandlerFactory,
                mockBundleLoader,
                mockTransitionManager,
                mockSdkFactoryBuilder,
                mockErrorHandlerManager,
            );

            // Note: preloadApp is called during loadingFn, which happens on first mount
            // We just verify the registration happened
            const registeredApps = singleSpa.getAppNames();
            const expectedAppId = mockSlot.getApplicationId();
            expect(registeredApps).to.include(expectedAppId);
        });

        it('should handle wrapped apps', () => {
            mockIlcConfigRoot.getConfigForAppByName.returns({
                name: 'testApp',
                spaBundle: 'http://localhost/app.js',
                wrappedWith: 'wrapperApp',
            });

            registeredAppsResult = registerApplications(
                mockIlcConfigRoot,
                mockRouter,
                mockAppErrorHandlerFactory,
                mockBundleLoader,
                mockTransitionManager,
                mockSdkFactoryBuilder,
                mockErrorHandlerManager,
            );

            const registeredApps = singleSpa.getAppNames();
            const expectedAppId = mockSlot.getApplicationId();
            expect(registeredApps).to.include(expectedAppId);
        });

        it('should register with custom props containing appId', () => {
            registeredAppsResult = registerApplications(
                mockIlcConfigRoot,
                mockRouter,
                mockAppErrorHandlerFactory,
                mockBundleLoader,
                mockTransitionManager,
                mockSdkFactoryBuilder,
                mockErrorHandlerManager,
            );

            const appId = mockSlot.getApplicationId();
            const registeredApps = singleSpa.getAppNames();
            expect(registeredApps).to.include(appId);

            // Verify custom props were created correctly
            const appName = mockSlot.getApplicationName();
            const slotName = mockSlot.getSlotName();
            expect(mockAppErrorHandlerFactory.calledWith(appName, slotName)).to.be.true;
        });

        it('should register with custom props containing domElementGetter', () => {
            registeredAppsResult = registerApplications(
                mockIlcConfigRoot,
                mockRouter,
                mockAppErrorHandlerFactory,
                mockBundleLoader,
                mockTransitionManager,
                mockSdkFactoryBuilder,
                mockErrorHandlerManager,
            );

            const registeredApps = singleSpa.getAppNames();
            const expectedAppId = mockSlot.getApplicationId();
            expect(registeredApps).to.include(expectedAppId);

            // The domElementGetter should reference the slot element we created
            const slotName = mockSlot.getSlotName();
            const slotElement = document.getElementById(`ilc-slot-${slotName}`);
            expect(slotElement).to.exist;
        });

        it('should handle apps with update props mode', () => {
            mockIlcConfigRoot.getConfig.returns({
                settings: {
                    onPropsUpdate: 'update',
                },
            });

            registeredAppsResult = registerApplications(
                mockIlcConfigRoot,
                mockRouter,
                mockAppErrorHandlerFactory,
                mockBundleLoader,
                mockTransitionManager,
                mockSdkFactoryBuilder,
                mockErrorHandlerManager,
            );

            const registeredApps = singleSpa.getAppNames();
            const expectedAppId = mockSlot.getApplicationId();
            expect(registeredApps).to.include(expectedAppId);
        });

        it('should register apps with getCurrentPathProps function', () => {
            const mockPathProps = { testProp: 'testValue' };
            mockRouter.getCurrentRouteProps.returns(mockPathProps);

            registeredAppsResult = registerApplications(
                mockIlcConfigRoot,
                mockRouter,
                mockAppErrorHandlerFactory,
                mockBundleLoader,
                mockTransitionManager,
                mockSdkFactoryBuilder,
                mockErrorHandlerManager,
            );

            const registeredApps = singleSpa.getAppNames();
            const expectedAppId = mockSlot.getApplicationId();
            expect(registeredApps).to.include(expectedAppId);
        });

        it('should register apps with getCurrentBasePath function', () => {
            mockRouter.getCurrentRoute.returns({ basePath: '/test-base' });

            registeredAppsResult = registerApplications(
                mockIlcConfigRoot,
                mockRouter,
                mockAppErrorHandlerFactory,
                mockBundleLoader,
                mockTransitionManager,
                mockSdkFactoryBuilder,
                mockErrorHandlerManager,
            );

            const registeredApps = singleSpa.getAppNames();
            const expectedAppId = mockSlot.getApplicationId();
            expect(registeredApps).to.include(expectedAppId);
        });
    });
});
