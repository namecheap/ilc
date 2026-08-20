import http from 'node:http';
import chai from 'chai';
import sinon from 'sinon';
import nock from 'nock';
import type { Logger } from 'ilc-plugins-sdk';

import requestFragmentSetup from './request-fragment';
import ServerRouter from './server-router';
import { getRegistryMock, getFragmentAttributes } from '../../tests/helpers';
import { FragmentRequestError } from './errors';
import type { FragmentAttributes } from './fragment-attributes';
import { pickSharedRenderHeaders, type FragmentRequest } from './fragment-render';
import type { PatchedHttpRequest } from '../types/PatchedHttpRequest';

interface TestRequest {
    registryConfig: unknown;
    ilcState: Record<string, unknown>;
    host: string;
    router?: ServerRouter;
}

type FilterHeadersFn = Parameters<typeof requestFragmentSetup>[0];
type ProcessFragmentResponseFn = Parameters<typeof requestFragmentSetup>[1];

describe('request-fragment', () => {
    /**
     * Mock filter
     * To be observed to be sure this one has been called
     * Returns always empty headers object
     */
    const filterHeadersMock = sinon.spy(() => ({}));

    /**
     * Mock fragment response processor
     * To be observed to be sure this one has been called
     */
    const processFragmentResponseMock = sinon.spy();

    const logger: Logger = {
        fatal: () => {},
        error: () => {},
        warn: () => {},
        info: () => {},
        debug: () => {},
        trace: () => {},
    };

    const requestFragment = requestFragmentSetup(
        filterHeadersMock as unknown as FilterHeadersFn,
        processFragmentResponseMock as unknown as ProcessFragmentResponseFn,
        logger,
    );

    afterEach(() => {
        processFragmentResponseMock.resetHistory();
        filterHeadersMock.resetHistory();
    });

    it('should request fragment with correct routerProps, appProps and required headers', async () => {
        // Initialisation

        const registryConfig = getRegistryMock().getConfig();

        const attributes = getFragmentAttributes({
            id: 'primary__at__primary',
            appProps: { publicPath: 'http://apps.test/primary' },
            wrapperConf: null,
            url: 'http://apps.test/primary',
            async: false,
            primary: false,
            public: false,
            timeout: 1000,
            returnHeaders: false,
            forwardQuerystring: false,
            ignoreInvalidSsl: false,
        });

        const request: TestRequest = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request as unknown as PatchedHttpRequest, '/primary');

        // Expectations

        const expectedRouterProps = { basePath: '/primary', reqUrl: '/primary', fragmentName: 'primary__at__primary' };
        const expectedAppProps = { publicPath: 'http://apps.test/primary' };
        const expectedSdkOptions = { i18n: { manifestPath: '/l10n/primary/manifest.json' } };

        const expectedRouterPropsEncoded = Buffer.from(JSON.stringify(expectedRouterProps)).toString('base64');
        const expectedAppPropsEncoded = Buffer.from(JSON.stringify(expectedAppProps)).toString('base64');
        const expectedSdkEncoded = Buffer.from(JSON.stringify(expectedSdkOptions)).toString('base64');

        const mockRequestScope = nock('http://apps.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
            .get('/primary')
            .query({
                routerProps: expectedRouterPropsEncoded,
                appProps: expectedAppPropsEncoded,
                sdk: expectedSdkEncoded,
            })
            .reply(200);

        // Processing

        await requestFragment(
            attributes.url as string,
            attributes as unknown as FragmentAttributes,
            request as unknown as FragmentRequest,
        );
        mockRequestScope.done();
        chai.expect(processFragmentResponseMock.calledOnce).to.be.equal(true);
        chai.expect(filterHeadersMock.calledOnce).to.be.equal(true);
    });

    it('should request fragment wrapper with correct routerProps, appProps and required headers', async () => {
        // Initialization

        const registryConfig = getRegistryMock().getConfig();

        const attributes = getFragmentAttributes({
            id: 'wrapperApp__at__primary',
            appProps: { page: 'wrapped' },
            wrapperConf: {
                appId: 'wrapper__at__primary',
                name: '@portal/wrapper',
                src: 'http://apps.test/wrapper',
                timeout: 2000,
                props: { param1: 'value1' },
            },
            url: 'http://apps.test/wrappedApp',
            async: false,
            primary: true,
            public: false,
            timeout: 1000,
            returnHeaders: false,
            forwardQuerystring: false,
            ignoreInvalidSsl: false,
        });

        const request: TestRequest = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request as unknown as PatchedHttpRequest, '/wrapper');

        // Expectations

        const expectedRouterProps = { basePath: '/', reqUrl: '/wrapper', fragmentName: 'wrapper__at__primary' };
        const expectedAppProps = { param1: 'value1' };
        const wrappedAppProps = { page: 'wrapped' };

        const expectedRouterPropsEncoded = Buffer.from(JSON.stringify(expectedRouterProps)).toString('base64');
        const expectedAppPropsEncoded = Buffer.from(JSON.stringify(expectedAppProps)).toString('base64');
        const expectedWrappedAppPropsEncoded = Buffer.from(JSON.stringify(wrappedAppProps)).toString('base64');

        const mockRequestScope = nock('http://apps.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
            .get('/wrapper')
            .query({
                routerProps: expectedRouterPropsEncoded,
                appProps: expectedAppPropsEncoded,
                wrappedProps: expectedWrappedAppPropsEncoded,
            })
            .reply(200);

        // Processing

        await requestFragment(
            attributes.url as string,
            attributes as unknown as FragmentAttributes,
            request as unknown as FragmentRequest,
        );
        mockRequestScope.done();
        chai.expect(processFragmentResponseMock.calledOnce).to.be.equal(true);
        chai.expect(filterHeadersMock.calledOnce).to.be.equal(true);
    });

    it('should request fragment of wrapped application with correct routerProps, appProps and required headers', async () => {
        // Initialisation

        const registryConfig = getRegistryMock().getConfig();

        const attributes = getFragmentAttributes({
            id: 'wrapperApp__at__primary',
            appProps: { page: 'wrapped' },
            wrapperConf: {
                appId: 'wrapper__at__primary',
                name: '@portal/wrapper',
                src: 'http://apps.test/wrapper',
                timeout: 2000,
                props: { param1: 'value1' },
            },
            url: 'http://apps.test/wrappedApp',
            async: false,
            primary: true,
            public: false,
            timeout: 1000,
            returnHeaders: false,
            forwardQuerystring: false,
            ignoreInvalidSsl: false,
        });

        const request: TestRequest = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request as unknown as PatchedHttpRequest, '/wrapper');

        // Expectations

        const expectedWrapperRouterProps = { basePath: '/', reqUrl: '/wrapper', fragmentName: 'wrapper__at__primary' };
        const expectedWrapperAppProps = { param1: 'value1' };
        const wrapperPropsOverride = { param2: 'value2' };
        const wrappedAppProps = { page: 'wrapped' };

        const expectedWrapperRouterPropsEncoded = Buffer.from(JSON.stringify(expectedWrapperRouterProps)).toString(
            'base64',
        );
        const expectedWrapperAppPropsEncoded = Buffer.from(JSON.stringify(expectedWrapperAppProps)).toString('base64');
        const wrapperPropsOverrideEncoded = Buffer.from(JSON.stringify(wrapperPropsOverride)).toString('base64');
        const expectedWrappedAppPropsEncoded = Buffer.from(JSON.stringify(wrappedAppProps)).toString('base64');

        const mockRequestWrapperScope = nock('http://apps.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
            .get('/wrapper')
            .query({
                routerProps: expectedWrapperRouterPropsEncoded,
                appProps: expectedWrapperAppPropsEncoded,
                wrappedProps: expectedWrappedAppPropsEncoded,
            })
            .reply(210, '', { 'x-props-override': wrapperPropsOverrideEncoded });

        const expectedWrappedAppRouterProps = {
            basePath: '/wrapper',
            reqUrl: '/wrapper',
            fragmentName: 'wrapperApp__at__primary',
        };
        // returned props from wrapper must be overrode for wrapped application
        const expectedWrappedAppAppProps = { page: 'wrapped', param2: 'value2' };

        const expectedWrappedAppRouterPropsEncoded = Buffer.from(
            JSON.stringify(expectedWrappedAppRouterProps),
        ).toString('base64');
        const expectedWrappedAppAppPropsEncoded = Buffer.from(JSON.stringify(expectedWrappedAppAppProps)).toString(
            'base64',
        );

        const mockRequestWrappedAppScope = nock('http://apps.test', {
            reqheaders: { 'accept-encoding': 'gzip, deflate' },
        })
            .get('/wrappedApp')
            .query({
                routerProps: expectedWrappedAppRouterPropsEncoded,
                appProps: expectedWrappedAppAppPropsEncoded,
            })
            .reply(200);

        // Processing

        await requestFragment(
            attributes.url as string,
            attributes as unknown as FragmentAttributes,
            request as unknown as FragmentRequest,
        );

        mockRequestWrapperScope.done();
        mockRequestWrappedAppScope.done();
        chai.expect(processFragmentResponseMock.calledOnce).to.be.equal(true);
        chai.expect(filterHeadersMock.calledTwice).to.be.equal(true);
    });

    it('should return timeout if timeout is specified for fragment', async () => {
        const registryConfig = getRegistryMock().getConfig();

        const timeoutMs = 200;
        const attributes = getFragmentAttributes({
            id: 'primary__at__primary',
            appProps: { publicPath: 'http://apps.test/primary' },
            wrapperConf: null,
            url: 'http://apps.test/primary',
            async: false,
            primary: false,
            public: false,
            timeout: timeoutMs,
            returnHeaders: false,
            forwardQuerystring: false,
            ignoreInvalidSsl: false,
        });

        const request: TestRequest = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request as unknown as PatchedHttpRequest, '/primary');

        // Expectations

        const expectedRouterProps = { basePath: '/primary', reqUrl: '/primary', fragmentName: 'primary__at__primary' };
        const expectedAppProps = { publicPath: 'http://apps.test/primary' };
        const expectedSdkOptions = { i18n: { manifestPath: '/l10n/primary/manifest.json' } };

        const expectedRouterPropsEncoded = Buffer.from(JSON.stringify(expectedRouterProps)).toString('base64');
        const expectedAppPropsEncoded = Buffer.from(JSON.stringify(expectedAppProps)).toString('base64');
        const expectedSdkEncoded = Buffer.from(JSON.stringify(expectedSdkOptions)).toString('base64');

        const mockRequestScope = nock('http://apps.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
            .get('/primary')
            .query({
                routerProps: expectedRouterPropsEncoded,
                appProps: expectedAppPropsEncoded,
                sdk: expectedSdkEncoded,
            })
            .delay(timeoutMs + 20)
            .reply(200);

        try {
            await requestFragment(
                attributes.url as string,
                attributes as unknown as FragmentAttributes,
                request as unknown as FragmentRequest,
            );
            mockRequestScope.done();
            chai.expect.fail('This code should not be reached, because error expected to be thrown above');
        } catch (e) {
            chai.expect(e).to.be.an.instanceof(FragmentRequestError);
            chai.expect((e as Error).message).to.contain('timeout');
        }
    });

    it('should still bound the socket with a default timeout when the fragment declares timeout: 0 or omits it', async () => {
        // registry ssr.timeout has no positivity constraint, and the LDE override cookie path
        // skips schema validation entirely — a falsy timeout must never mean "no timeout" at the
        // transport level, or a hanging origin holds the connection open forever.
        //
        // A direct spy on http.ClientRequest.prototype.setTimeout doesn't reliably see calls made
        // through nock's own socket mock, so instead the actual request instance returned by
        // http.request() is wrapped in place, right where it's created — this observes both the
        // options object http.request() was called with AND the explicit .setTimeout(ms, callback)
        // call makeRequest() makes on the live instance afterward, including that an abort callback
        // is actually wired (a duration with no callback would never abort a hung connection).
        const registryConfig = getRegistryMock().getConfig();
        const originalRequest = http.request;
        let capturedSetTimeoutCall: { ms: number; hasCallback: boolean } | null = null;
        const requestStub = sinon.stub(http, 'request').callsFake((...args: any[]) => {
            const req = (originalRequest as any).apply(http, args);
            const originalSetTimeout = req.setTimeout.bind(req);
            req.setTimeout = (ms: number, fn: () => void) => {
                capturedSetTimeoutCall = { ms, hasCallback: typeof fn === 'function' };
                return originalSetTimeout(ms, fn);
            };
            return req;
        });

        try {
            for (const timeout of [0, undefined]) {
                const attributes = getFragmentAttributes({
                    id: 'primary__at__primary',
                    appProps: { publicPath: 'http://apps.test/primary' },
                    wrapperConf: null,
                    url: 'http://apps.test/primary',
                    async: false,
                    primary: false,
                    public: false,
                    timeout,
                    returnHeaders: false,
                    forwardQuerystring: false,
                    ignoreInvalidSsl: false,
                });

                const request: TestRequest = {
                    registryConfig,
                    ilcState: {},
                    host: 'apps.test',
                };
                request.router = new ServerRouter(logger, request as unknown as PatchedHttpRequest, '/primary');

                const mockRequestScope = nock('http://apps.test').get('/primary').query(true).reply(200);

                requestStub.resetHistory();
                capturedSetTimeoutCall = null;
                await requestFragment(
                    attributes.url as string,
                    attributes as unknown as FragmentAttributes,
                    request as unknown as FragmentRequest,
                );
                mockRequestScope.done();

                chai.expect(requestStub.calledOnce, `timeout=${timeout}`).to.be.equal(true);
                chai.expect(
                    (requestStub.firstCall.args[0] as any).timeout,
                    `timeout=${timeout} (options.timeout)`,
                ).to.be.greaterThan(0);
                chai.expect(capturedSetTimeoutCall, `timeout=${timeout} (setTimeout was called)`).to.not.be.null;
                chai.expect(capturedSetTimeoutCall!.ms, `timeout=${timeout} (setTimeout ms)`).to.be.greaterThan(0);
                chai.expect(
                    capturedSetTimeoutCall!.hasCallback,
                    `timeout=${timeout} (abort callback wired)`,
                ).to.be.equal(true);
            }
        } finally {
            requestStub.restore();
        }
    });

    it('should handle network error when requesting fragment', async () => {
        const registryConfig = getRegistryMock().getConfig();

        const attributes = getFragmentAttributes({
            id: 'primary__at__primary',
            appProps: { publicPath: 'http://apps.test/primary' },
            wrapperConf: null,
            url: 'http://apps.test/primary',
            async: false,
            primary: false,
            public: false,
            timeout: 1000,
            returnHeaders: false,
            forwardQuerystring: false,
            ignoreInvalidSsl: false,
        });

        const request: TestRequest = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request as unknown as PatchedHttpRequest, '/primary');

        const networkError = Object.assign(new Error('Network error'), { code: 'ECONNREFUSED' });

        const mockRequestScope = nock('http://apps.test').get('/primary').query(true).replyWithError(networkError);

        try {
            await requestFragment(
                attributes.url as string,
                attributes as unknown as FragmentAttributes,
                request as unknown as FragmentRequest,
            );
            mockRequestScope.done();
            chai.expect.fail('This code should not be reached, because error expected to be thrown above');
        } catch (e) {
            chai.expect(e).to.be.an.instanceof(FragmentRequestError);
            chai.expect((e as Error).message).to.contain('Error during SSR request to fragment');
        }
    });

    it('should handle network error when requesting wrapper fragment', async () => {
        const registryConfig = getRegistryMock().getConfig();

        const attributes = getFragmentAttributes({
            id: 'wrapperApp__at__primary',
            appProps: { page: 'wrapped' },
            wrapperConf: {
                appId: 'wrapper__at__primary',
                name: '@portal/wrapper',
                src: 'http://apps.test/wrapper',
                timeout: 2000,
                props: { param1: 'value1' },
            },
            url: 'http://apps.test/wrappedApp',
            async: false,
            primary: true,
            public: false,
            timeout: 1000,
            returnHeaders: false,
            forwardQuerystring: false,
            ignoreInvalidSsl: false,
        });

        const request: TestRequest = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request as unknown as PatchedHttpRequest, '/wrapper');

        const networkError = Object.assign(new Error('Network error'), { code: 'ECONNREFUSED' });

        const mockRequestScope = nock('http://apps.test').get('/wrapper').query(true).replyWithError(networkError);

        try {
            await requestFragment(
                attributes.url as string,
                attributes as unknown as FragmentAttributes,
                request as unknown as FragmentRequest,
            );
            mockRequestScope.done();
            chai.expect.fail('This code should not be reached, because error expected to be thrown above');
        } catch (e) {
            chai.expect(e).to.be.an.instanceof(FragmentRequestError);
            chai.expect((e as Error).message).to.contain('Error during SSR request to fragment wrapper');
        }
    });

    it('should handle HTTPS requests', async () => {
        const registryConfig = getRegistryMock().getConfig();

        const attributes = getFragmentAttributes({
            id: 'primary__at__primary',
            appProps: { publicPath: 'https://secure.test/primary' },
            wrapperConf: null,
            url: 'https://secure.test/primary',
            async: false,
            primary: false,
            public: false,
            timeout: 1000,
            returnHeaders: false,
            forwardQuerystring: false,
            ignoreInvalidSsl: false,
        });

        const request: TestRequest = {
            registryConfig,
            ilcState: {},
            host: 'secure.test',
        };
        request.router = new ServerRouter(logger, request as unknown as PatchedHttpRequest, '/primary');

        const mockRequestScope = nock('https://secure.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
            .get('/primary')
            .query(true)
            .reply(200);

        await requestFragment(
            attributes.url as string,
            attributes as unknown as FragmentAttributes,
            request as unknown as FragmentRequest,
        );
        mockRequestScope.done();
        chai.expect(processFragmentResponseMock.calledOnce).to.be.equal(true);
    });

    it('should ignore invalid SSL certificates when ignoreInvalidSsl is true', async () => {
        const registryConfig = getRegistryMock().getConfig();

        const attributes = getFragmentAttributes({
            id: 'primary__at__primary',
            appProps: { publicPath: 'https://secure.test/primary' },
            wrapperConf: null,
            url: 'https://secure.test/primary',
            async: false,
            primary: false,
            public: false,
            timeout: 1000,
            returnHeaders: false,
            forwardQuerystring: false,
            ignoreInvalidSsl: true,
        });

        const request: TestRequest = {
            registryConfig,
            ilcState: {},
            host: 'secure.test',
        };
        request.router = new ServerRouter(logger, request as unknown as PatchedHttpRequest, '/primary');

        const mockRequestScope = nock('https://secure.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
            .get('/primary')
            .query(true)
            .reply(200);

        await requestFragment(
            attributes.url as string,
            attributes as unknown as FragmentAttributes,
            request as unknown as FragmentRequest,
        );
        mockRequestScope.done();
        chai.expect(processFragmentResponseMock.calledOnce).to.be.equal(true);
    });

    it('should warn when fragmentProxyHeaders are configured but the render is shared (cacheable)', async () => {
        const warn = sinon.spy();
        const requestFragmentWithSpyLogger = requestFragmentSetup(
            filterHeadersMock as unknown as FilterHeadersFn,
            processFragmentResponseMock as unknown as ProcessFragmentResponseFn,
            {
                warn,
                debug: () => {},
            } as unknown as Logger,
        );

        const registryConfig = getRegistryMock({ settings: { fragmentProxyHeaders: ['x-custom-header'] } }).getConfig();

        const attributes = getFragmentAttributes({
            id: 'primary__at__primary',
            appProps: { publicPath: 'http://apps.test/primary' },
            wrapperConf: null,
            url: 'http://apps.test/primary',
            async: false,
            primary: false,
            public: false,
            timeout: 1000,
            returnHeaders: false,
            forwardQuerystring: false,
            ignoreInvalidSsl: false,
        });

        const request: TestRequest = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request as unknown as PatchedHttpRequest, '/primary');

        const mockRequestScope = nock('http://apps.test').get('/primary').query(true).reply(200);

        await requestFragmentWithSpyLogger(
            attributes.url as string,
            attributes as unknown as FragmentAttributes,
            request as unknown as FragmentRequest,
            { mode: 'shared', varyHeaders: pickSharedRenderHeaders({ 'x-request-host': 'apps.test' }) },
        );
        mockRequestScope.done();

        chai.expect(warn.calledOnce).to.be.equal(true);
        chai.expect(warn.firstCall.args[1]).to.match(/fragmentProxyHeaders/);
    });

    it('warns once per app about dropped fragmentProxyHeaders, not on every shared render', async () => {
        const warn = sinon.spy();
        const requestFragmentWithSpyLogger = requestFragmentSetup(
            filterHeadersMock as unknown as FilterHeadersFn,
            processFragmentResponseMock as unknown as ProcessFragmentResponseFn,
            {
                warn,
                debug: () => {},
            } as unknown as Logger,
        );

        const registryConfig = getRegistryMock({ settings: { fragmentProxyHeaders: ['x-custom-header'] } }).getConfig();

        // a global setting, so it is stated once per app rather than on every shared render
        const renderShared = async (id: string) => {
            const attributes = getFragmentAttributes({
                id,
                appProps: { publicPath: 'http://apps.test/primary' },
                wrapperConf: null,
                url: 'http://apps.test/primary',
                async: false,
                primary: false,
                public: false,
                timeout: 1000,
                returnHeaders: false,
                forwardQuerystring: false,
                ignoreInvalidSsl: false,
            });

            const request: TestRequest = {
                registryConfig,
                ilcState: {},
                host: 'apps.test',
            };
            request.router = new ServerRouter(logger, request as unknown as PatchedHttpRequest, '/primary');

            const mockRequestScope = nock('http://apps.test').get('/primary').query(true).reply(200);

            await requestFragmentWithSpyLogger(
                attributes.url as string,
                attributes as unknown as FragmentAttributes,
                request as unknown as FragmentRequest,
                { mode: 'shared', varyHeaders: pickSharedRenderHeaders({ 'x-request-host': 'apps.test' }) },
            );
            mockRequestScope.done();
        };

        await renderShared('primary__at__primary');
        await renderShared('primary__at__primary');
        await renderShared('regular__at__regular');

        chai.expect(warn.callCount).to.be.equal(2);
        chai.expect(warn.getCalls().map((call) => (call.args[0] as { appId: string }).appId)).to.deep.equal([
            'primary__at__primary',
            'regular__at__regular',
        ]);
    });
});
