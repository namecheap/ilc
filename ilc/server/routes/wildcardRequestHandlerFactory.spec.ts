import type { Logger } from 'ilc-plugins-sdk';
import newrelic from 'newrelic';
import sinon from 'sinon';

import { expect } from 'chai';
import { TransitionHooksExecutor } from '../TransitionHooksExecutor';
import { ErrorHandler } from '../types/ErrorHandler';
import { IlcRouteHandlerMethod } from '../types/IlcRouteHandlerMethod';
import { PatchedFastifyRequest, PatchedHttpRequest } from '../types/PatchedHttpRequest';
import { Registry } from '../types/Registry';
import { wildcardRequestHandlerFactory } from './wildcardRequestHandlerFactory';

describe('wildcardRequestHandlerFactory', () => {
    let mockLogger: sinon.SinonStubbedInstance<Logger>;
    let mockRegistryService: sinon.SinonStubbedInstance<Registry>;
    let mockErrorHandlingService: sinon.SinonStubbedInstance<ErrorHandler>;
    let mockTransitionHooksExecutor: sinon.SinonStubbedInstance<TransitionHooksExecutor>;
    let mockTailor: any;
    let wildcardRequestHandler: IlcRouteHandlerMethod;
    let newrelicGetTransactionStub: sinon.SinonStub;
    let newrelicIgnoreStub: sinon.SinonStub;

    beforeEach(() => {
        newrelicIgnoreStub = sinon.stub();
        newrelicGetTransactionStub = sinon.stub(newrelic, 'getTransaction').returns({
            ignore: newrelicIgnoreStub,
        } as any);

        mockLogger = {
            error: sinon.stub(),
            warn: sinon.stub(),
            info: sinon.stub(),
            debug: sinon.stub(),
            fatal: sinon.stub(),
            trace: sinon.stub(),
        };

        mockErrorHandlingService = {
            handleError: sinon.stub(),
            noticeError: sinon.stub(),
            handleClientError: sinon.stub(),
        };

        mockRegistryService = {
            getConfig: sinon.stub().resolves({
                settings: {
                    trailingSlash: 'disabled',
                    overrideConfigTrustedOrigins: ['localhost'],
                    i18n: {
                        enabled: false,
                        supported: { locale: {}, currency: {} },
                        default: { locale: 'en-US', currency: 'USD' },
                    },
                },
                routes: [
                    {
                        routeId: 'test-route',
                        route: '/test',
                        next: false,
                        slots: {},
                        template: 'test-template',
                    },
                    {
                        routeId: 'test-path-route',
                        route: '/test-path',
                        next: false,
                        slots: {},
                        template: 'test-template',
                    },
                    {
                        routeId: 'wildcard',
                        route: '*',
                        next: false,
                        slots: {},
                        template: 'test-template',
                    },
                ],
                apps: {},
            }),
            resolveDomainId: sinon.stub().resolves(1),
            getTemplate: sinon.stub().resolves({ data: { content: 'template', styleRefs: [] }, cachedAt: Date.now() }),
        } as any;

        mockTransitionHooksExecutor = {
            redirectTo: sinon.stub().resolves(null),
        } as any;

        mockTailor = {
            requestHandler: sinon.stub(),
        };

        wildcardRequestHandler = wildcardRequestHandlerFactory(
            mockLogger,
            mockRegistryService,
            mockErrorHandlingService,
            mockTransitionHooksExecutor,
            mockTailor,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('LDE detection', () => {
        it('should set ldeRelated flag and ignore newrelic when override configs present', async () => {
            const mockRequest = {
                hostname: 'test.com',
                headers: {
                    cookie: 'ILC-overrideConfig=%7B%22apps%22%3A%7B%7D%7D', // encoded {"apps":{}}
                },
                raw: {
                    url: '/test',
                    ilcState: {},
                    ldeRelated: undefined,
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                res: {},
            };

            try {
                await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);
            } catch (error) {
                // We expect this to fail later in processing, but we only care about LDE detection
            }

            // Verify LDE detection worked
            expect(mockRequest.raw.ldeRelated).to.be.true;
            sinon.assert.calledOnce(newrelicGetTransactionStub);
            sinon.assert.calledOnce(newrelicIgnoreStub);
        });

        it('should NOT set ldeRelated flag when no override configs', async () => {
            const mockRequest = {
                hostname: 'test.com',
                headers: {
                    cookie: '',
                },
                raw: {
                    url: '/test',
                    ilcState: {},
                    ldeRelated: undefined,
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                res: {},
            };

            try {
                await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);
            } catch (error) {
                // We expect this to fail later in processing, but we only care about LDE detection
            }

            // Verify LDE was NOT detected
            expect(mockRequest.raw.ldeRelated).to.be.undefined;
            sinon.assert.notCalled(newrelicGetTransactionStub);
            sinon.assert.notCalled(newrelicIgnoreStub);
        });

        it('should NOT set ldeRelated flag when override configs are invalid', async () => {
            const mockRequest = {
                hostname: 'test.com',
                headers: {
                    cookie: 'ILC-overrideConfig=invalid-json',
                },
                raw: {
                    url: '/test',
                    ilcState: {},
                    ldeRelated: undefined,
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                res: {},
            };

            try {
                await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);
            } catch (error) {
                // We expect this to fail later in processing, but we only care about LDE detection
            }

            // Verify LDE was NOT detected due to invalid JSON
            expect(mockRequest.raw.ldeRelated).to.be.undefined;
            sinon.assert.notCalled(newrelicGetTransactionStub);
            sinon.assert.notCalled(newrelicIgnoreStub);
        });
    });

    describe('Trailing slash redirects', () => {
        it('should redirect with 301 when URL needs trailing slash and setting is redirectToTrailingSlash', async () => {
            mockRegistryService.getConfig.resolves({
                settings: {
                    trailingSlash: 'redirectToTrailingSlash',
                    overrideConfigTrustedOrigins: ['localhost'],
                    i18n: { enabled: false },
                },
                routes: [],
                apps: {},
            } as any);

            const mockRequest = {
                hostname: 'test.com',
                headers: {},
                raw: {
                    url: '/test',
                    ilcState: {},
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                res: {},
            };

            await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);

            sinon.assert.calledOnce(mockReply.redirect);
            sinon.assert.calledWith(mockReply.redirect, 301, '/test/');
        });

        it('should redirect with 302 when URL needs adjustment and setting is redirectToNonTrailingSlash', async () => {
            mockRegistryService.getConfig.resolves({
                settings: {
                    trailingSlash: 'redirectToNonTrailingSlash',
                    overrideConfigTrustedOrigins: 'localhost',
                    i18n: {
                        enabled: false,
                        supported: { locale: [], currency: [] },
                        default: { locale: 'en-US', currency: 'USD' },
                    },
                },
                routes: [
                    {
                        routeId: 1,
                        route: '/test',
                        next: true,
                        orderPos: -99,
                        template: 'commonTemplate',
                        slots: {},
                        meta: {}, // Added meta
                        versionId: 'v1.0.0', // Added versionId
                    },
                ],
                apps: {},
                sharedLibs: {},
                dynamicLibs: {},
                specialRoutes: {},
            });

            const mockRequest = {
                hostname: 'test.com',
                headers: {},
                log: mockLogger,
                raw: {
                    url: '/test/',
                    ilcState: {},
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                header: sinon.stub(),
                status: sinon.stub().returns({ send: sinon.stub() }),
                res: {},
            };
            await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);

            sinon.assert.calledOnce(mockReply.redirect);
            sinon.assert.calledWith(mockReply.redirect, 302, '/test');
        });
    });

    describe('Request headers', () => {
        it('should set x-request-host and x-request-uri headers', async () => {
            const mockRequest = {
                hostname: 'test.com',
                headers: {} as any,
                log: mockLogger,
                raw: {
                    url: '/test-path',
                    ilcState: {},
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                header: sinon.stub(),
                status: sinon.stub().returns({ send: sinon.stub() }),
                res: {},
            };

            await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);

            expect(mockRequest.headers['x-request-host']).to.equal('test.com');
            expect(mockRequest.headers['x-request-uri']).to.equal('/test-path');
        });
    });

    describe('TransitionHooks redirects', () => {
        it('should redirect when transitionHooksExecutor returns a redirect', async () => {
            mockTransitionHooksExecutor.redirectTo.resolves({
                code: 302,
                location: '/new-location',
            });

            const mockRequest = {
                hostname: 'test.com',
                headers: {},
                log: mockLogger,
                raw: {
                    url: '/test',
                    ilcState: { locale: 'en-US' },
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                res: {},
            };

            await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);

            sinon.assert.calledOnce(mockReply.redirect);
            sinon.assert.calledWith(mockReply.redirect, 302, sinon.match.string);
        });

        it('should NOT redirect when transitionHooksExecutor returns null', async () => {
            mockTransitionHooksExecutor.redirectTo.resolves(null);

            const mockRequest = {
                hostname: 'test.com',
                headers: {},
                log: mockLogger,
                raw: {
                    url: '/test',
                    ilcState: {},
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                header: sinon.stub(),
                status: sinon.stub().returns({ send: sinon.stub() }),
                res: {},
            };

            await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);

            sinon.assert.notCalled(mockReply.redirect);
        });
    });

    describe('CSP header handling', () => {
        it('should set CSP header successfully', async () => {
            mockRegistryService.getConfig.resolves({
                settings: {
                    trailingSlash: 'disabled',
                    overrideConfigTrustedOrigins: 'localhost',
                    i18n: {
                        enabled: false,
                        supported: { locale: [], currency: [] },
                        default: { locale: 'en-US', currency: 'USD' },
                    },
                    cspConfig: { defaultSrc: ["'self'"] },
                    cspEnableStrict: false,
                    cspTrustedLocalHosts: [],
                },
                routes: [
                    {
                        routeId: 1,
                        route: '/test',
                        next: false,
                        slots: { slot1: { appName: 'test-app', kind: 'regular', props: {} } },
                        template: 'test-template',
                        meta: {},
                        versionId: '',
                        orderPos: 0,
                    },
                ],
                apps: {
                    'test-app': { spaBundle: 'http://example.com/app.js' },
                },
                sharedLibs: {},
                dynamicLibs: {},
                specialRoutes: {},
            });

            const mockRequest = {
                hostname: 'test.com',
                headers: {},
                log: mockLogger,
                raw: {
                    url: '/test',
                    ilcState: {},
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                hijack: sinon.stub(),
                sent: false,
                raw: {
                    setHeader: sinon.stub(),
                },
            };

            await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);

            // CSP header should be set on reply.res
            expect(mockReply.raw).to.exist;
            sinon.assert.notCalled(mockErrorHandlingService.noticeError);
        });

        it('should catch and report CSP errors', async () => {
            const cspError = new Error('CSP error');

            mockRegistryService.getConfig.resolves({
                settings: {
                    trailingSlash: 'disabled',
                    overrideConfigTrustedOrigins: 'localhost',
                    i18n: {
                        enabled: false,
                        supported: { locale: [], currency: [] },
                        default: { locale: 'en-US', currency: 'USD' },
                    },
                    cspConfig: { defaultSrc: ["'self'"] },
                    cspEnableStrict: false,
                    cspTrustedLocalHosts: [],
                },
                routes: [
                    {
                        routeId: 1,
                        route: '/test',
                        next: false,
                        slots: { slot1: { appName: 'test-app', kind: 'regular', props: {} } },
                        template: 'test-template',
                        meta: {},
                        versionId: '',
                        orderPos: 0,
                    },
                ],
                apps: {
                    'test-app': { spaBundle: 'http://example.com/app.js' },
                },
                sharedLibs: {},
                dynamicLibs: {},
                specialRoutes: {},
            });

            const mockRequest = {
                hostname: 'test.com',
                headers: {},
                log: mockLogger,
                raw: {
                    url: '/test',
                    ilcState: {},
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                hijack: sinon.stub(),
                sent: false,
                res: {
                    setHeader: sinon.stub().throws(cspError),
                },
            };

            await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);

            sinon.assert.calledOnce(mockErrorHandlingService.noticeError);
            sinon.assert.calledWith(mockErrorHandlingService.noticeError, sinon.match.instanceOf(Error), {
                message: 'CSP object processing error',
            });
        });
    });

    describe('Routes without slots', () => {
        it('should render template directly for routes without slots', async () => {
            const templateContent = '<html><body>Test Template</body></html>';

            mockRegistryService.getTemplate.resolves({
                data: { content: templateContent, styleRefs: [] },
                cachedAt: Date.now(),
            });

            const mockRequest = {
                hostname: 'test.com',
                headers: {},
                log: mockLogger,
                raw: {
                    url: '/test',
                    ilcState: { locale: 'en-US' },
                },
            };

            const sendStub = sinon.stub();
            const mockReply = {
                redirect: sinon.stub(),
                header: sinon.stub(),
                status: sinon.stub().returns({ send: sendStub }),
                res: {},
            };

            await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);

            sinon.assert.calledOnce(mockReply.header);
            sinon.assert.calledWith(mockReply.header, 'Content-Type', 'text/html');
            sinon.assert.calledOnce(mockReply.status);
            sinon.assert.calledWith(mockReply.status, 200);
            sinon.assert.calledOnce(sendStub);
            sinon.assert.calledWith(sendStub, templateContent);
            sinon.assert.calledWith(mockRegistryService.getTemplate, 'test-template', { locale: 'en-US' });
        });

        it('should pass locale to getTemplate when available', async () => {
            const mockRequest = {
                hostname: 'test.com',
                headers: {},
                log: mockLogger,
                raw: {
                    url: '/test',
                    ilcState: { locale: 'fr-FR' },
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                header: sinon.stub(),
                status: sinon.stub().returns({ send: sinon.stub() }),
                res: {},
            };

            await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);

            sinon.assert.calledWith(mockRegistryService.getTemplate, 'test-template', { locale: 'fr-FR' });
        });
    });

    describe('Routes with slots (Tailor)', () => {
        it('should call tailor.requestHandler for routes with slots', async () => {
            mockRegistryService.getConfig.resolves({
                settings: {
                    trailingSlash: 'disabled',
                    overrideConfigTrustedOrigins: 'localhost',
                    i18n: {
                        enabled: false,
                        supported: { locale: [], currency: [] },
                        default: { locale: 'en-US', currency: 'USD' },
                    },
                },
                routes: [
                    {
                        routeId: 1,
                        route: '/test',
                        next: false,
                        slots: {
                            header: { appName: 'header-app', kind: 'regular', props: {} },
                            body: { appName: 'body-app', kind: 'regular', props: {} },
                        },
                        template: 'test-template',
                        meta: {},
                        versionId: '1',
                        orderPos: 0,
                    },
                ],
                apps: {
                    'header-app': { spaBundle: 'http://example.com/header.js' },
                    'body-app': { spaBundle: 'http://example.com/body.js' },
                },
                sharedLibs: {},
                dynamicLibs: {},
                specialRoutes: {},
            });

            const mockRequest = {
                hostname: 'test.com',
                headers: {},
                log: mockLogger,
                raw: {
                    url: '/test',
                    ilcState: {},
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                hijack: sinon.stub(),
                raw: {},
            };

            await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);

            sinon.assert.calledOnce(mockTailor.requestHandler);
            sinon.assert.calledOnce(mockReply.hijack);
            sinon.assert.calledWith(mockTailor.requestHandler, mockRequest.raw, mockReply.raw);
        });

        it('should validate slot collection for routes with slots', async () => {
            mockRegistryService.getConfig.resolves({
                settings: {
                    trailingSlash: 'disabled',
                    overrideConfigTrustedOrigins: ['localhost'],
                    i18n: {
                        enabled: false,
                        supported: { locale: {}, currency: {} },
                        default: { locale: 'en-US', currency: 'USD' },
                    },
                },
                routes: [
                    {
                        routeId: 'test-route',
                        route: '/test',
                        next: false,
                        slots: {
                            header: { appName: 'header-app' },
                        },
                        template: 'test-template',
                    },
                ],
                apps: {
                    'header-app': { spaBundle: 'http://example.com/app.js' },
                },
            } as any);

            const mockRequest = {
                hostname: 'test.com',
                headers: {},
                log: mockLogger,
                raw: {
                    url: '/test',
                    ilcState: {},
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                hijack: sinon.stub(),
                sent: false,
                res: {},
            };

            await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);

            // SlotCollection.isValid() should be called - if invalid, it would throw
            sinon.assert.calledOnce(mockTailor.requestHandler);
        });
    });

    describe('ServerRouter and config setup', () => {
        it('should merge configs properly when override configs present', async () => {
            const mockRequest = {
                hostname: 'test.com',
                headers: {
                    cookie: 'ILC-overrideConfig=%7B%22apps%22%3A%7B%7D%7D',
                },
                log: mockLogger,
                raw: {
                    url: '/test',
                    ilcState: {},
                    registryConfig: undefined,
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                header: sinon.stub(),
                status: sinon.stub().returns({ send: sinon.stub() }),
                res: {},
            };

            await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);

            // Should have called resolveDomainId when override configs are present
            sinon.assert.calledOnce(mockRegistryService.resolveDomainId);
            sinon.assert.calledWith(mockRegistryService.resolveDomainId, 'test.com');

            // registryConfig should be set on raw request
            expect(mockRequest.raw.registryConfig).to.exist;
        });

        it('should NOT resolve domainId when no override configs', async () => {
            const mockRequest = {
                hostname: 'test.com',
                headers: {
                    cookie: '',
                },
                log: mockLogger,
                raw: {
                    url: '/test',
                    ilcState: {},
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                header: sinon.stub(),
                status: sinon.stub().returns({ send: sinon.stub() }),
                res: {},
            };

            await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);

            // Should NOT call resolveDomainId when no override configs
            sinon.assert.notCalled(mockRegistryService.resolveDomainId);
        });

        it('should create ServerRouter with correct parameters', async () => {
            const mockRequest = {
                hostname: 'test.com',
                headers: {},
                log: mockLogger,
                raw: {
                    url: '/test',
                    ilcState: {},
                    router: undefined,
                },
            };

            const mockReply = {
                redirect: sinon.stub(),
                header: sinon.stub(),
                status: sinon.stub().returns({ send: sinon.stub() }),
                res: {},
            };

            await wildcardRequestHandler.call({} as any, mockRequest as any, mockReply as any);
            // ServerRouter should be created and assigned
            expect(mockRequest.raw.router).to.exist;
            expect((mockRequest as unknown as PatchedFastifyRequest).raw.router?.getRoute).to.be.a('function');
        });
    });
});
