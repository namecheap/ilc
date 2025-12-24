import { expect } from 'chai';
import * as singleSpa from 'single-spa';
import sinon from 'sinon';

import { BundleLoader } from './BundleLoader';
import { Client } from './Client';
import Router from './ClientRouter';
import ilcEvents from './constants/ilcEvents';
import singleSpaEvents from './constants/singleSpaEvents';
import ErrorHandlerManager from './ErrorHandlerManager/ErrorHandlerManager';
import * as navigationEvents from './navigationEvents/setupEvents';
import { TransitionManager } from './TransitionManager/TransitionManager';

describe('Client', () => {
    let client;
    let mockConfigRoot;
    let mockRouter;

    beforeEach(() => {
        mockConfigRoot = {
            isGlobalSpinnerEnabled: () => false,
            getSettingsByKey: (key) => {
                if (key === 'i18n') {
                    return { enabled: false };
                }
                if (key === 'globalSpinner') {
                    return {};
                }
                if (key === 'trailingSlash') {
                    return 'doNothing';
                }
                return {};
            },
            getConfigForApps: () => ({}),
            getConfigForRoutes: () => [],
            getConfigForSpecialRoutesByKey: () => ({ slots: {} }),
            getConfigForAppByName: (name) => {
                // Handle both with and without @portal/ prefix
                const cleanName = name.replace('@portal/', '');
                if (cleanName === 'testApp') {
                    return { kind: 'regular' };
                }
                if (cleanName === 'regularApp') {
                    return { kind: 'regular' };
                }
                if (cleanName === 'primaryApp') {
                    return { kind: 'primary' };
                }
                if (cleanName === 'essentialApp') {
                    return { kind: 'essential' };
                }
                return null;
            },
            getConfigForSharedLibsByName: (name) => ({ name }),
            getConfig: () => ({
                settings: {
                    amdDefineCompatibilityMode: false,
                },
                sharedLibs: {
                    'test-lib': {},
                },
                routes: [
                    {
                        route: '*',
                        next: false,
                        template: 'commonTemplate',
                        slots: {},
                    },
                ],
            }),
        };

        mockRouter = {
            getCurrentRoute: () => ({
                basePath: '/base',
                reqUrl: '/base/path',
            }),
            getRelevantAppKind: (appName, slotName) => {
                // Handle both with and without @portal/ prefix
                const cleanName = appName.replace('@portal/', '');
                if (cleanName === 'primaryApp') return 'primary';
                if (cleanName === 'essentialApp') return 'essential';
                if (cleanName === 'testApp') return 'regular';
                return 'regular';
            },
        };
        window.ilcApps = [];

        client = new Client(mockConfigRoot);
        client.router = mockRouter; // Inject mock router
    });

    afterEach(async () => {
        client.destroy();
        await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it('should call the handler when a route change event occurs', (done) => {
        const handler = sinon.spy();

        // Add the route change handler
        const removeHandler = window.ILC.onRouteChange(handler);

        // Simulate a single-spa routing event
        const routingEvent = new CustomEvent(singleSpaEvents.ROUTING_EVENT);
        window.dispatchEvent(routingEvent);

        // Assert that the handler was called
        setTimeout(() => {
            expect(handler.calledOnce).to.be.true;

            // Assert that the handler received the correct arguments
            expect(handler.args[0][0]).to.equal(routingEvent);
            // Remove the handler and ensure it no longer listens
            removeHandler();
            window.dispatchEvent(routingEvent);
            setTimeout(() => {
                expect(handler.calledOnce).to.be.true; // No additional calls
                done();
            }, 0);
        }, 0);
    });

    describe('onIntlChange', () => {
        it('should throw error if handler is not a function', () => {
            expect(() => window.ILC.onIntlChange('not a function')).to.throw(
                'onIntlChange should pass function handler as first argument',
            );
        });

        it('should call handler when intl update event is dispatched', (done) => {
            const handler = sinon.spy();
            window.ILC.onIntlChange(handler);

            const intlEvent = new CustomEvent(ilcEvents.INTL_UPDATE, {
                detail: { locale: 'en-US', currency: 'USD' },
            });
            window.dispatchEvent(intlEvent);

            setTimeout(() => {
                expect(handler.calledOnce).to.be.true;
                expect(handler.args[0][0]).to.deep.equal({ locale: 'en-US', currency: 'USD' });
                done();
            }, 0);
        });
    });

    describe('onRouteChange', () => {
        it('should throw error if handler is not a function', () => {
            expect(() => window.ILC.onRouteChange('not a function')).to.throw(
                'onRouteChange should pass function handler as first argument',
            );
        });
    });

    describe('matchCurrentRoute', () => {
        beforeEach(async () => {
            // Set up actual location for Router to use
            history.pushState({}, '', '/');
            // Allow pending events to settle
        });

        it('should return true when URL matches current route', () => {
            const result = window.ILC.matchCurrentRoute('/');
            expect(result).to.be.true;
        });

        it('should return false when URL does not match current route', () => {
            const result = window.ILC.matchCurrentRoute('/different/path');
            expect(result).to.be.false;
        });

        it('should handle trailing slashes correctly', () => {
            const result1 = window.ILC.matchCurrentRoute('/');
            expect(result1).to.be.true;
        });
    });

    describe('getIntlAdapter', () => {
        it('should return null when i18n is disabled', () => {
            const adapter = window.ILC.getIntlAdapter();
            expect(adapter).to.be.null;
        });

        it('should return adapter when i18n is enabled', () => {
            client.destroy();
            mockConfigRoot.getSettingsByKey = (key) => {
                if (key === 'i18n') {
                    return {
                        enabled: true,
                        default: { locale: 'en-US', currency: 'USD' },
                        supported: {
                            locale: ['en-US'],
                            currency: ['USD'],
                        },
                        routingStrategy: 'prefix_except_default',
                    };
                }
                return {};
            };

            client = new Client(mockConfigRoot);
            const adapter = window.ILC.getIntlAdapter();
            expect(adapter).to.not.be.null;
            expect(adapter.get).to.be.a('function');
        });
    });

    describe('getAllSharedLibNames', () => {
        it('should return all shared library names', async () => {
            const names = await window.ILC.getAllSharedLibNames();
            expect(names).to.deep.equal(['test-lib']);
        });
    });

    describe('getSharedLibConfigByName', () => {
        it('should return config for shared library', async () => {
            const config = await window.ILC.getSharedLibConfigByName('test-lib');
            expect(config).to.deep.equal({ name: 'test-lib' });
        });
    });

    describe('getApplicationConfigByName', () => {
        it('should return config for application', async () => {
            const config = await window.ILC.getApplicationConfigByName('testApp');
            expect(config).to.deep.equal({ kind: 'regular' });
        });
    });

    describe('getSharedLibConfigByNameSync', () => {
        it('should return config for shared library synchronously', () => {
            const config = window.ILC.getSharedLibConfigByNameSync('test-lib');
            expect(config).to.deep.equal({ name: 'test-lib' });
        });
    });

    describe('SystemJS module loader', () => {
        let handleErrorStub;
        let originalSystem;

        beforeEach(() => {
            // Destroy the main client to avoid interference
            client.destroy();

            // Save original System
            originalSystem = window.System;

            // Stub ErrorHandlerManager
            handleErrorStub = sinon.stub(ErrorHandlerManager.prototype, 'handleError');
        });

        afterEach(() => {
            // Restore System
            if (originalSystem) {
                window.System = originalSystem;
            }

            // Restore stub
            if (handleErrorStub) {
                handleErrorStub.restore();
            }
            client.destroy();
        });

        it('should throw error when SystemJS is not available', () => {
            delete window.System;

            let caughtError;
            try {
                client = new Client(mockConfigRoot);
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).to.exist;
            expect(caughtError.message).to.equal("ILC: can't find SystemJS on a page, crashing everything");
        });

        it('should call onCriticalInternalError when SystemJS is not available', () => {
            delete window.System;

            try {
                client = new Client(mockConfigRoot);
            } catch (error) {
                // Expected to throw
            }

            expect(handleErrorStub.calledOnce).to.be.true;
            const errorArg = handleErrorStub.firstCall.args[0];
            expect(errorArg.name).to.equal('CriticalInternalError');
            expect(errorArg.message).to.equal("ILC: can't find SystemJS on a page, crashing everything");
        });
    });

    describe('navigationErrorHandler', () => {
        let testClient;
        let handleErrorStub;
        let setNavigationErrorHandlerStub;
        let registeredNavigationErrorHandler;

        beforeEach(() => {
            // Destroy the main client instance
            client.destroy();

            // Stub ErrorHandlerManager
            handleErrorStub = sinon.stub(ErrorHandlerManager.prototype, 'handleError');

            // Stub setNavigationErrorHandler to capture the handler
            registeredNavigationErrorHandler = null;
            setNavigationErrorHandlerStub = sinon
                .stub(navigationEvents, 'setNavigationErrorHandler')
                .callsFake((handler) => {
                    registeredNavigationErrorHandler = handler;
                });

            // Create new client with stubs in place
            testClient = new Client(mockConfigRoot);
        });

        afterEach(() => {
            if (testClient) {
                testClient.destroy();
            }
            if (handleErrorStub) {
                handleErrorStub.restore();
            }
            if (setNavigationErrorHandlerStub) {
                setNavigationErrorHandlerStub.restore();
            }
        });

        it('should register a navigation error handler', () => {
            expect(setNavigationErrorHandlerStub.calledOnce).to.be.true;
            expect(registeredNavigationErrorHandler).to.be.a('function');
        });

        it('should create NavigationError and call error handler when navigation error occurs', () => {
            const error = new Error('Navigation failed');
            const errorInfo = { url: '/test-url', extra: 'data' };

            // Trigger the navigation error
            registeredNavigationErrorHandler(error, errorInfo);

            expect(handleErrorStub.calledOnce).to.be.true;
            const errorArg = handleErrorStub.firstCall.args[0];
            expect(errorArg.name).to.equal('NavigationError');
            expect(errorArg.message).to.equal('Navigation failed');
            expect(errorArg.cause).to.equal(error);
            expect(errorArg.data).to.deep.equal(errorInfo);
        });

        it('should handle navigation errors with different error info', () => {
            const error = new Error('Route not found');
            const errorInfo = { url: '/404', status: 404 };

            registeredNavigationErrorHandler(error, errorInfo);

            expect(handleErrorStub.calledOnce).to.be.true;
            const errorArg = handleErrorStub.firstCall.args[0];
            expect(errorArg.name).to.equal('NavigationError');
            expect(errorArg.message).to.equal('Route not found');
            expect(errorArg.data.url).to.equal('/404');
            expect(errorArg.data.status).to.equal(404);
        });

        it('should handle navigation errors with empty error info', () => {
            const error = new Error('Unknown navigation error');

            registeredNavigationErrorHandler(error, {});

            expect(handleErrorStub.calledOnce).to.be.true;
            const errorArg = handleErrorStub.firstCall.args[0];
            expect(errorArg.name).to.equal('NavigationError');
            expect(errorArg.message).to.equal('Unknown navigation error');
            expect(errorArg.data).to.deep.equal({});
        });
    });

    describe('amdDefineCompatibilityMode', () => {
        it('should not expose window.define when amdDefineCompatibilityMode is true', () => {
            client.destroy();

            const originalDefine = window.define;
            mockConfigRoot.getConfig = () => ({
                settings: {
                    amdDefineCompatibilityMode: true,
                },
                sharedLibs: {},
                routes: [
                    {
                        route: '*',
                        next: false,
                        template: 'commonTemplate',
                        slots: {},
                    },
                ],
            });

            client = new Client(mockConfigRoot);

            // window.define should remain the original value when amdDefineCompatibilityMode is true
            // (i.e., it should NOT be set to window.ILC.define)
            expect(window.define).to.equal(originalDefine);
        });
    });

    describe('window.ILC API', () => {
        it('should expose window.define when amdDefineCompatibilityMode is false', () => {
            expect(window.define).to.equal(window.ILC.define);
        });

        it('should expose loadApp method', () => {
            expect(window.ILC.loadApp).to.be.a('function');
        });

        it('should expose unloadApp method', () => {
            expect(window.ILC.unloadApp).to.be.a('function');
        });

        it('should expose navigate method', () => {
            expect(window.ILC.navigate).to.be.a('function');
        });

        it('should expose mountRootParcel method', () => {
            expect(window.ILC.mountRootParcel).to.be.a('function');
        });

        it('should expose importParcelFromApp method', () => {
            expect(window.ILC.importParcelFromApp).to.be.a('function');
        });

        it('should expose getAppSdkAdapter method', () => {
            expect(window.ILC.getAppSdkAdapter).to.be.a('function');
        });
    });

    describe('unloadApp', () => {
        let unloadApplicationStub;
        let bundleLoaderUnloadStub;
        let testClient;

        beforeEach(() => {
            // Destroy the main client instance to avoid double subscription errors
            client.destroy();

            // Stub singleSpa.unloadApplication
            unloadApplicationStub = sinon.stub(singleSpa, 'unloadApplication').resolves();

            // Stub BundleLoader.unloadApp before creating Client instance
            bundleLoaderUnloadStub = sinon.stub(BundleLoader.prototype, 'unloadApp');

            // Create a new Client instance with the stub in place
            testClient = new Client(mockConfigRoot);
        });

        afterEach(() => {
            if (testClient) {
                testClient.destroy();
            }
            if (unloadApplicationStub) {
                unloadApplicationStub.restore();
            }
            if (bundleLoaderUnloadStub) {
                bundleLoaderUnloadStub.restore();
            }
        });

        it('should call singleSpa.unloadApplication with appId', async () => {
            const appId = 'testApp__at__slot1';

            await testClient.unloadApp(appId);

            expect(unloadApplicationStub.calledOnce).to.be.true;
            expect(unloadApplicationStub.calledWith(appId)).to.be.true;
        });

        it('should call bundleLoader.unloadApp with app name', async () => {
            const appId = 'testApp__at__slot1';
            const expectedAppName = '@portal/testApp';

            await testClient.unloadApp(appId);

            expect(bundleLoaderUnloadStub.calledOnce).to.be.true;
            expect(bundleLoaderUnloadStub.calledWith(expectedAppName)).to.be.true;
        });

        it('should extract app name from appId with slot', async () => {
            const appId = 'myApp__at__mySlot';
            const expectedAppName = '@portal/myApp';

            await testClient.unloadApp(appId);

            expect(bundleLoaderUnloadStub.calledWith(expectedAppName)).to.be.true;
            expect(unloadApplicationStub.calledWith(appId)).to.be.true;
        });

        it('should handle appId without slot', async () => {
            const appId = '@portal/sharedLib';

            await testClient.unloadApp(appId);

            expect(bundleLoaderUnloadStub.calledWith(appId)).to.be.true;
            expect(unloadApplicationStub.calledWith(appId)).to.be.true;
        });

        it('should return a promise that resolves when unload completes', async () => {
            const appId = '@portal/testApp__slot1';
            unloadApplicationStub.resolves('success');

            await testClient.unloadApp(appId);

            expect(unloadApplicationStub.calledOnce).to.be.true;
        });

        it('should propagate errors from singleSpa.unloadApplication', async () => {
            const appId = 'testApp__at__slot1';
            const error = new Error('Unload failed');
            unloadApplicationStub.rejects(error);

            try {
                await testClient.unloadApp(appId);
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err).to.equal(error);
            }
        });
    });

    describe('onLifecycleError', () => {
        let reportSlotRenderingErrorStub;
        let handleErrorStub;
        let testClient;
        let addErrorHandlerStub;
        let registeredErrorHandlers;

        beforeEach(() => {
            // Destroy the main client instance to avoid double subscription errors
            client.destroy();

            // Capture all error handlers registered with single-spa
            registeredErrorHandlers = [];
            addErrorHandlerStub = sinon.stub(singleSpa, 'addErrorHandler').callsFake((handler) => {
                registeredErrorHandlers.push(handler);
            });

            // Stub TransitionManager methods
            reportSlotRenderingErrorStub = sinon.stub(TransitionManager.prototype, 'reportSlotRenderingError');

            // Stub ErrorHandlerManager methods
            handleErrorStub = sinon.stub(ErrorHandlerManager.prototype, 'handleError');

            // Create a new Client instance with the stubs in place
            testClient = new Client(mockConfigRoot);
            testClient.router = mockRouter;
        });

        afterEach(() => {
            if (testClient) {
                testClient.destroy();
            }
            if (addErrorHandlerStub) {
                addErrorHandlerStub.restore();
            }
            if (reportSlotRenderingErrorStub) {
                reportSlotRenderingErrorStub.restore();
            }
            if (handleErrorStub) {
                handleErrorStub.restore();
            }
        });

        it('should register an error handler with single-spa', () => {
            expect(addErrorHandlerStub.calledOnce).to.be.true;
            expect(registeredErrorHandlers).to.have.lengthOf(1);
            expect(registeredErrorHandlers[0]).to.be.a('function');
        });

        it('should report slot rendering error to transition manager', () => {
            const lifecycleError = {
                appOrParcelName: 'testApp__at__slot1',
                message: 'Failed to mount',
            };

            // Trigger the lifecycle error by calling the registered error handler
            registeredErrorHandlers[0](lifecycleError);

            expect(reportSlotRenderingErrorStub.calledOnce).to.be.true;
            expect(reportSlotRenderingErrorStub.calledWith('slot1')).to.be.true;
        });

        it('should call error handler for the app', () => {
            const lifecycleError = {
                appOrParcelName: 'testApp__at__slot1',
                message: 'Failed to mount',
            };

            // Trigger the lifecycle error
            registeredErrorHandlers[0](lifecycleError);

            expect(handleErrorStub.calledOnce).to.be.true;
        });

        it('should handle errors for primary apps', () => {
            const lifecycleError = {
                appOrParcelName: 'primaryApp__at__mainSlot',
                message: 'Failed to mount primary app',
            };

            // Trigger the lifecycle error
            registeredErrorHandlers[0](lifecycleError);

            expect(reportSlotRenderingErrorStub.calledWith('mainSlot')).to.be.true;
            expect(handleErrorStub.calledOnce).to.be.true;
        });

        it('should handle errors for essential apps', () => {
            const lifecycleError = {
                appOrParcelName: 'essentialApp__at__headerSlot',
                message: 'Failed to mount essential app',
            };

            // Trigger the lifecycle error
            registeredErrorHandlers[0](lifecycleError);

            expect(reportSlotRenderingErrorStub.calledWith('headerSlot')).to.be.true;
            expect(handleErrorStub.calledOnce).to.be.true;
        });

        it('should handle errors for regular apps', () => {
            const lifecycleError = {
                appOrParcelName: 'testApp__at__regularSlot',
                message: 'Failed to mount regular app',
            };

            // Trigger the lifecycle error
            registeredErrorHandlers[0](lifecycleError);

            expect(reportSlotRenderingErrorStub.calledWith('regularSlot')).to.be.true;
            expect(handleErrorStub.calledOnce).to.be.true;
        });

        it('should handle errors for apps without slots', () => {
            const lifecycleError = {
                appOrParcelName: '@portal/sharedLib',
                message: 'Failed to load shared lib',
            };

            // Trigger the lifecycle error
            registeredErrorHandlers[0](lifecycleError);

            expect(reportSlotRenderingErrorStub.calledWith('none')).to.be.true;
            expect(handleErrorStub.calledOnce).to.be.true;
        });

        it('should extract correct app name and slot name from appOrParcelName', () => {
            const lifecycleError = {
                appOrParcelName: 'myCustomApp__at__myCustomSlot',
                message: 'Custom app failed',
            };

            // Trigger the lifecycle error
            registeredErrorHandlers[0](lifecycleError);

            expect(reportSlotRenderingErrorStub.calledWith('myCustomSlot')).to.be.true;
            expect(handleErrorStub.calledOnce).to.be.true;
        });

        it('should create CriticalFragmentError when app does not exist', () => {
            const lifecycleError = {
                appOrParcelName: 'nonExistentApp__at__slot1',
                message: 'Failed to mount non-existent app',
            };

            // Trigger the lifecycle error
            registeredErrorHandlers[0](lifecycleError);

            expect(handleErrorStub.calledOnce).to.be.true;
            const errorArg = handleErrorStub.firstCall.args[0];
            expect(errorArg.name).to.equal('CriticalFragmentError');
            expect(errorArg.data.name).to.equal('@portal/nonExistentApp');
        });

        it('should create CriticalFragmentError for primary apps', () => {
            const lifecycleError = {
                appOrParcelName: 'primaryApp__at__mainSlot',
                message: 'Failed to mount primary app',
            };

            // Trigger the lifecycle error
            registeredErrorHandlers[0](lifecycleError);

            expect(handleErrorStub.calledOnce).to.be.true;
            const errorArg = handleErrorStub.firstCall.args[0];
            expect(errorArg.name).to.equal('CriticalFragmentError');
            expect(errorArg.data.name).to.equal('@portal/primaryApp');
        });

        it('should create CriticalFragmentError for essential apps', () => {
            const lifecycleError = {
                appOrParcelName: 'essentialApp__at__headerSlot',
                message: 'Failed to mount essential app',
            };

            // Trigger the lifecycle error
            registeredErrorHandlers[0](lifecycleError);

            expect(handleErrorStub.calledOnce).to.be.true;
            const errorArg = handleErrorStub.firstCall.args[0];
            expect(errorArg.name).to.equal('CriticalFragmentError');
            expect(errorArg.data.name).to.equal('@portal/essentialApp');
        });

        it('should create FragmentError for regular apps by stubbing Router prototype', () => {
            // Stub Router.prototype.getRelevantAppKind to return 'regular'
            const getRelevantAppKindStub = sinon.stub(Router.prototype, 'getRelevantAppKind').returns('regular');

            try {
                // Destroy existing client and create a new one with the stubbed router
                testClient.destroy();
                addErrorHandlerStub.resetHistory();
                reportSlotRenderingErrorStub.resetHistory();
                handleErrorStub.resetHistory();

                // Clear registered handlers
                registeredErrorHandlers = [];

                // Create new client with the stub in place
                // Don't override router - let it use the real Router instance with stubbed method
                testClient = new Client(mockConfigRoot);

                // Now registeredErrorHandlers should have the new handler
                expect(registeredErrorHandlers).to.have.lengthOf(1);

                const lifecycleError = {
                    appOrParcelName: 'regularApp__at__regularSlot',
                    message: 'Failed to mount regular app',
                };

                // Trigger the lifecycle error
                registeredErrorHandlers[0](lifecycleError);

                expect(handleErrorStub.calledOnce).to.be.true;
                const errorArg = handleErrorStub.firstCall.args[0];
                expect(errorArg.name).to.equal('FragmentError');
                expect(errorArg.data.name).to.equal('@portal/regularApp');
                expect(errorArg.data.slotName).to.equal('regularSlot');
            } finally {
                getRelevantAppKindStub.restore();
            }
        });
    });
});
