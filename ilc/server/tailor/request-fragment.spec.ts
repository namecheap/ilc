import chai from 'chai';
import nock from 'nock';
import sinon from 'sinon';
import net from 'node:net';
import http from 'node:http';

import { requestFragmentFactory as requestFragmentSetup } from './request-fragment';
import { ServerRouter } from './server-router';
import { getFragmentAttributes, getRegistryMock } from '../../tests/helpers';
import errors from './errors';

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixtures below deliberately build
   partial tailor requests and fragment attributes; typing them fully would assert shapes these
   tests do not exercise. */

describe('request-fragment', () => {
    /**
     * Mock filter
     * To be observed to be sure this one has been called
     * Returns always empty headers object
     * @returns {{}}
     */
    const filterHeadersMock = sinon.spy(() => ({}));

    /**
     * Mock fragment response processor
     * To be observed to be sure this one has been called
     */
    const processFragmentResponseMock = sinon.spy();

    const logger = {
        warn: () => {},
        debug: () => {},
    };

    const requestFragment = requestFragmentSetup(filterHeadersMock, processFragmentResponseMock, logger);

    afterEach(() => {
        processFragmentResponseMock.resetHistory();
        filterHeadersMock.resetHistory();
        // A test whose request is intentionally never dispatched leaves its interceptor
        // pending, which would otherwise be consumed by — and fail — a later test.
        nock.cleanAll();
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

        const request: any = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request, '/primary');

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

        await requestFragment(attributes.url, attributes, request);
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

        const request: any = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request, '/wrapper');

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

        await requestFragment(attributes.url, attributes, request);
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

        const request: any = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request, '/wrapper');

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

        await requestFragment(attributes.url, attributes, request);

        mockRequestWrapperScope.done();
        mockRequestWrappedAppScope.done();
        chai.expect(processFragmentResponseMock.calledOnce).to.be.equal(true);
        chai.expect(filterHeadersMock.calledTwice).to.be.equal(true);
    });

    it('should return timeout if timeout is specified for fragment', async () => {
        const registryConfig = getRegistryMock().getConfig();

        let timeoutMs = 200;
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

        const request: any = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request, '/primary');

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
            await requestFragment(attributes.url, attributes, request);
            mockRequestScope.done();
            chai.expect.fail('This code should not be reached, because error expected to be thrown above');
        } catch (e: any) {
            chai.expect(e).to.be.an.instanceof(errors.FragmentRequestError);
            chai.expect(e.message).to.contain('timeout');
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

        const request: any = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request, '/primary');

        const networkError: NodeJS.ErrnoException = new Error('Network error');
        networkError.code = 'ECONNREFUSED';

        const mockRequestScope = nock('http://apps.test').get('/primary').query(true).replyWithError(networkError);

        try {
            await requestFragment(attributes.url, attributes, request);
            mockRequestScope.done();
            chai.expect.fail('This code should not be reached, because error expected to be thrown above');
        } catch (e: any) {
            chai.expect(e).to.be.an.instanceof(errors.FragmentRequestError);
            chai.expect(e.message).to.contain('Error during SSR request to fragment');
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

        const request: any = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request, '/wrapper');

        const networkError: NodeJS.ErrnoException = new Error('Network error');
        networkError.code = 'ECONNREFUSED';

        const mockRequestScope = nock('http://apps.test').get('/wrapper').query(true).replyWithError(networkError);

        try {
            await requestFragment(attributes.url, attributes, request);
            mockRequestScope.done();
            chai.expect.fail('This code should not be reached, because error expected to be thrown above');
        } catch (e: any) {
            chai.expect(e).to.be.an.instanceof(errors.FragmentRequestError);
            chai.expect(e.message).to.contain('Error during SSR request to fragment wrapper');
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

        const request: any = {
            registryConfig,
            ilcState: {},
            host: 'secure.test',
        };
        request.router = new ServerRouter(logger, request, '/primary');

        const mockRequestScope = nock('https://secure.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
            .get('/primary')
            .query(true)
            .reply(200);

        await requestFragment(attributes.url, attributes, request);
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

        const request: any = {
            registryConfig,
            ilcState: {},
            host: 'secure.test',
        };
        request.router = new ServerRouter(logger, request, '/primary');

        const mockRequestScope = nock('https://secure.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
            .get('/primary')
            .query(true)
            .reply(200);

        await requestFragment(attributes.url, attributes, request);
        mockRequestScope.done();
        chai.expect(processFragmentResponseMock.calledOnce).to.be.equal(true);
    });
    it('should reject with a named error when an app wrapper has no ssr src', async () => {
        // A wrapper declaring `ssr: {}` passes the router's "does this wrapper support SSR"
        // check and arrives here with src absent, because WrapperConf.src is optional for
        // exactly that reason.
        //
        // The guard is enforced by the compiler, not by this test: delete it and the build
        // fails, because wrapperConf.src stops satisfying makeFragmentUrl's `baseUrl: string`.
        // What this pins is the observable behaviour — a FragmentRequestError naming the
        // wrapper, rather than the anonymous TypeError `new URL(undefined)` would raise from
        // inside the promise executor.
        const registryConfig = getRegistryMock().getConfig();
        const attributes = getFragmentAttributes({
            id: 'wrapperApp__at__primary',
            appProps: {},
            wrapperConf: {
                appId: 'wrapper__at__primary',
                name: '@portal/wrapper',
                timeout: 2000,
                props: {},
            },
            url: 'http://apps.test/wrappedApp',
            primary: true,
        });
        const request: any = { registryConfig, ilcState: {}, host: 'apps.test' };
        request.router = new ServerRouter(logger, request, '/wrapper');

        let rejected;
        try {
            await requestFragment(attributes.url, attributes, request);
        } catch (error: any) {
            rejected = error;
        }

        chai.expect(rejected).to.be.an.instanceof(errors.FragmentRequestError);
        chai.expect(rejected.message).to.contain('wrapper__at__primary');
    });

    describe('request size pre-flight', () => {
        const buildFragment = (maxRequestSize?: unknown) => {
            const warn = sinon.spy();
            const processResponse = sinon.spy();
            const requestFragmentWithLimit = requestFragmentSetup(
                filterHeadersMock,
                processResponse,
                { warn, debug: () => {} },
                { maxRequestSize },
            );

            return { warn, processResponse, requestFragmentWithLimit };
        };

        const buildRequest = (extraAppProps = {}) => {
            const registryConfig = getRegistryMock().getConfig();
            const attributes = getFragmentAttributes({
                id: 'primary__at__primary',
                appProps: { publicPath: 'http://apps.test/primary', ...extraAppProps },
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
            const request: any = { registryConfig, ilcState: {}, host: 'apps.test', id: 'test-operation-id' };
            request.router = new ServerRouter(logger, request, '/primary');

            return { attributes, request };
        };

        it('should not dispatch to the fragment when the request would exceed the limit', async () => {
            const { attributes, request } = buildRequest();
            const { warn, processResponse, requestFragmentWithLimit } = buildFragment(200);

            // No nock interceptor is registered: a dispatch would fail the test.
            await requestFragmentWithLimit(attributes.url, attributes, request);

            chai.expect(warn.calledOnce).to.be.equal(true);
            chai.expect(processResponse.calledOnce).to.be.equal(true);
        });

        it('should report size, limit, appId and the largest header name without any header value', async () => {
            const { attributes, request } = buildRequest();
            const { warn, requestFragmentWithLimit } = buildFragment(200);

            await requestFragmentWithLimit(attributes.url, attributes, request);

            const [payload] = warn.firstCall.args;
            chai.expect(payload.limit).to.be.equal(200);
            chai.expect(payload.size).to.be.above(200);
            chai.expect(payload.appId).to.be.equal('primary__at__primary');
            // The ticket names size, limit, path and operationId as the WARN's required
            // fields; operationId must appear under that exact key, as the other log
            // lines in request-fragment.js report it, not only under the enhanced
            // logger's own label.
            chai.expect(payload.operationId).to.be.equal('test-operation-id');
            chai.expect(payload.path).to.be.equal('/primary');
            chai.expect(payload.largestHeader).to.have.property('name');
            chai.expect(payload.largestHeader).to.have.property('bytes');
            chai.expect(Object.keys(payload)).to.not.include('headers');
        });

        it('should leave the guard disabled when the configured value is not a usable number', async () => {
            // An unparseable value must not make every comparison false and skip every
            // fragment. The guard is opt-in, so it stays off and says so once at setup rather
            // than running at a ceiling nobody chose.
            const { attributes, request } = buildRequest();
            const warn = sinon.spy();
            const requestFragmentWithBadLimit = requestFragmentSetup(
                filterHeadersMock,
                sinon.spy(),
                { warn, debug: () => {} },
                { maxRequestSize: Number('not-a-number') },
            );

            chai.expect(warn.calledOnce).to.be.equal(true);
            chai.expect(warn.firstCall.args[0].limit).to.be.equal(0);

            const mockRequestScope = nock('http://apps.test').get('/primary').query(true).reply(200);

            await requestFragmentWithBadLimit(attributes.url, attributes, request);

            // The guard is off, so the request dispatches without a further warn.
            mockRequestScope.done();
            chai.expect(warn.calledOnce).to.be.equal(true);
        });

        it('should warn on a blank string, unlike the explicit zero off-switch', async () => {
            // Number(' ') is 0, which is also the off switch, so with an opt-in guard both
            // resolve to the same limit. What still separates them is the log line: a stray
            // space in the env var is a misconfiguration and says so, where an explicit 0 is a
            // deliberate choice and stays silent.
            const warn = sinon.spy();
            requestFragmentSetup(filterHeadersMock, sinon.spy(), { warn, debug: () => {} }, { maxRequestSize: ' ' });

            chai.expect(warn.calledOnce).to.be.equal(true);
            chai.expect(warn.firstCall.args[0].limit).to.be.equal(0);

            const silent = sinon.spy();
            requestFragmentSetup(
                filterHeadersMock,
                sinon.spy(),
                { warn: silent, debug: () => {} },
                { maxRequestSize: 0 },
            );

            chai.expect(silent.called).to.be.equal(false);
        });

        it('should accept a numeric string limit, as an env var supplies it', async () => {
            const { attributes, request } = buildRequest();
            const warn = sinon.spy();
            const requestFragmentWithStringLimit = requestFragmentSetup(
                filterHeadersMock,
                sinon.spy(),
                { warn, debug: () => {} },
                { maxRequestSize: '200' },
            );

            await requestFragmentWithStringLimit(attributes.url, attributes, request);

            chai.expect(warn.calledOnce).to.be.equal(true);
            chai.expect(warn.firstCall.args[0].limit).to.be.equal(200);
        });

        it('should treat a limit of zero as the guard being switched off', async () => {
            // Zero is the off switch and also the shipped default. It must stay off rather
            // than falling back to a ceiling of ILC's choosing.
            const { attributes, request } = buildRequest();
            const warn = sinon.spy();
            // The same request is skipped at a limit of 200 (covered above), so dispatching
            // it here is what proves zero means off rather than "fall back to the default".
            const requestFragmentDisabled = requestFragmentSetup(
                filterHeadersMock,
                sinon.spy(),
                { warn, debug: () => {} },
                { maxRequestSize: 0 },
            );
            const mockRequestScope = nock('http://apps.test').get('/primary').query(true).reply(200);

            await requestFragmentDisabled(attributes.url, attributes, request);

            mockRequestScope.done();
            chai.expect(warn.called).to.be.equal(false);
        });

        it('should degrade with a WARN and no rejection when the app has no client bundle', async () => {
            // The acceptance criteria allow no ERROR for an over-limit request, and a
            // rejection becomes one via tailor's fragment-error handling. The slot stays
            // blank for an app that cannot render client-side, so the WARN records that.
            const registryConfig = getRegistryMock().getConfig();
            const attributes = getFragmentAttributes({
                id: 'primary__at__primary',
                appProps: {},
                wrapperConf: null,
                url: 'http://apps.test/primary',
                spaBundleUrl: undefined,
                primary: true,
            });
            const request: any = { registryConfig, ilcState: {}, host: 'apps.test' };
            request.router = new ServerRouter(logger, request, '/primary');

            const warn = sinon.spy();
            const processResponse = sinon.spy();
            const requestFragmentWithLimit = requestFragmentSetup(
                filterHeadersMock,
                processResponse,
                { warn, debug: () => {} },
                {
                    maxRequestSize: 200,
                },
            );

            await requestFragmentWithLimit(attributes.url, attributes, request);

            chai.expect(warn.calledOnce).to.be.equal(true);
            chai.expect(warn.firstCall.args[0].hasClientBundle).to.be.equal(false);
            chai.expect(processResponse.calledOnce).to.be.equal(true);
        });

        it('should name both the wrapper and the wrapped app when a wrapper is skipped', async () => {
            // The url was built for wrapperConf.appId, so reporting only attributes.id
            // leaves operators unable to tell which wrapper went over.
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
                    spaBundleUrl: 'http://apps.test/wrapper-bundle.js',
                },
                url: 'http://apps.test/wrappedApp',
                primary: true,
            });
            const request: any = { registryConfig, ilcState: {}, host: 'apps.test' };
            request.router = new ServerRouter(logger, request, '/wrapper');

            const warn = sinon.spy();
            const requestFragmentWithLimit = requestFragmentSetup(
                filterHeadersMock,
                sinon.spy(),
                { warn, debug: () => {} },
                {
                    maxRequestSize: 200,
                },
            );

            await requestFragmentWithLimit(attributes.url, attributes, request);

            const [payload] = warn.firstCall.args;
            chai.expect(payload.appId).to.be.equal('wrapper__at__primary');
            chai.expect(payload.wrappedAppId).to.be.equal('wrapperApp__at__primary');
        });

        it('should treat a wrapped slot as unfillable when only the wrapper has a client bundle', async () => {
            // Client-side recovery combines the wrapped app with the wrapper's bundle, so
            // a wrapper bundle alone cannot fill the slot of an SSR-only wrapped app: the
            // suppression must report hasClientBundle false and answer 431 for a primary.
            const registryConfig = getRegistryMock().getConfig();
            const attributes = getFragmentAttributes({
                id: 'wrapperApp__at__primary',
                appProps: {},
                wrapperConf: {
                    appId: 'wrapper__at__primary',
                    name: '@portal/wrapper',
                    src: 'http://apps.test/wrapper',
                    timeout: 2000,
                    props: {},
                    spaBundleUrl: 'http://apps.test/wrapper-bundle.js',
                },
                url: 'http://apps.test/wrappedApp',
                spaBundleUrl: undefined,
                primary: true,
            });
            const request: any = { registryConfig, ilcState: {}, host: 'apps.test' };
            request.router = new ServerRouter(logger, request, '/wrapper');

            const warn = sinon.spy();
            const processResponse = sinon.spy();
            const requestFragmentWithLimit = requestFragmentSetup(
                filterHeadersMock,
                processResponse,
                { warn, debug: () => {} },
                { maxRequestSize: 200 },
            );

            await requestFragmentWithLimit(attributes.url, attributes, request);

            chai.expect(warn.firstCall.args[0].hasClientBundle).to.be.equal(false);
            chai.expect(processResponse.firstCall.args[0].statusCode).to.be.equal(431);
        });

        it('should cancel the built request without raising an unhandled error', async () => {
            // destroy() makes node emit ECONNRESET asynchronously; if the guard cancels
            // before a listener is attached, that becomes an uncaught exception.
            const { attributes, request } = buildRequest();
            const { requestFragmentWithLimit } = buildFragment(200);

            const unhandled: unknown[] = [];
            const onUncaught = (error: unknown) => unhandled.push(error);
            process.on('uncaughtException', onUncaught);
            process.on('unhandledRejection', onUncaught);

            try {
                await requestFragmentWithLimit(attributes.url, attributes, request);
                await new Promise((resolve) => setTimeout(resolve, 150));
            } finally {
                process.removeListener('uncaughtException', onUncaught);
                process.removeListener('unhandledRejection', onUncaught);
            }

            chai.expect(unhandled).to.deep.equal([]);
        });

        it('should measure a request whose expect header materialized the block at construction', async () => {
            // Node builds `_header` inside the ClientRequest constructor when an `expect`
            // header is present, and a second _implicitHeader() call throws
            // ERR_HTTP_HEADERS_SENT — the guard must measure such a request, not crash.
            const { attributes, request } = buildRequest();
            const warn = sinon.spy();
            const processResponse = sinon.spy();
            const expectForwardingFilter = () => ({ expect: '100-continue' });
            const requestFragmentWithExpect = requestFragmentSetup(
                expectForwardingFilter,
                processResponse,
                { warn, debug: () => {} },
                { maxRequestSize: 200 },
            );

            // No nock interceptor is registered: a dispatch would fail the test.
            await requestFragmentWithExpect(attributes.url, attributes, request);

            chai.expect(warn.calledOnce).to.be.equal(true);
            chai.expect(processResponse.calledOnce).to.be.equal(true);
        });

        it('should dispatch an over-limit request under the shipped default configuration', async () => {
            // The guard is opt-in: shipped disabled so upgrading ILC does not change an existing
            // deployment's behaviour. This same fixture IS suppressed at a limit of 200 (covered
            // above), so dispatching here is what proves the shipped configuration leaves it off.
            // Reading the value from config rather than a literal also fails if default.json5 and
            // the module's fallback ever drift apart.
            const shippedLimit = require('config').get('tailor.maxFragmentRequestSize');

            chai.expect(shippedLimit, 'the guard must ship disabled').to.be.equal(0);

            const { attributes, request } = buildRequest();
            const warn = sinon.spy();
            const processResponse = sinon.spy();
            // No options object at all — this is the shipped path.
            const requestFragmentShipped = requestFragmentSetup(filterHeadersMock, processResponse, {
                warn,
                debug: () => {},
            });
            const mockRequestScope = nock('http://apps.test').get('/primary').query(true).reply(200);

            await requestFragmentShipped(attributes.url, attributes, request);

            // Dispatched, and silent: the interceptor being consumed is the proof.
            mockRequestScope.done();
            chai.expect(warn.called).to.be.equal(false);
            chai.expect(processResponse.calledOnce).to.be.equal(true);
        });

        it('should keep an over-limit SSR-only wrapper on the degradation path', async () => {
            // AC-003 names the wrapper case explicitly: no dispatch, WARN only, and no
            // FragmentRequestError even though the wrapper has no client bundle.
            const registryConfig = getRegistryMock().getConfig();
            const attributes = getFragmentAttributes({
                id: 'wrapperApp__at__primary',
                appProps: {},
                wrapperConf: {
                    appId: 'wrapper__at__primary',
                    name: '@portal/wrapper',
                    src: 'http://apps.test/wrapper',
                    timeout: 2000,
                    props: {},
                },
                url: 'http://apps.test/wrappedApp',
                spaBundleUrl: undefined,
                primary: true,
            });
            const request: any = { registryConfig, ilcState: {}, host: 'apps.test' };
            request.router = new ServerRouter(logger, request, '/wrapper');

            const warn = sinon.spy();
            const processResponse = sinon.spy();
            const requestFragmentWithLimit = requestFragmentSetup(
                filterHeadersMock,
                processResponse,
                { warn, debug: () => {} },
                {
                    maxRequestSize: 200,
                },
            );

            let rejected;
            try {
                await requestFragmentWithLimit(attributes.url, attributes, request);
            } catch (error: any) {
                rejected = error;
            }

            chai.expect(rejected).to.be.equal(undefined);
            chai.expect(warn.calledOnce).to.be.equal(true);
            chai.expect(warn.firstCall.args[0].appId).to.be.equal('wrapper__at__primary');
            chai.expect(processResponse.calledOnce).to.be.equal(true);
        });

        const suppressedResponse = async (overrides: Record<string, unknown>) => {
            const registryConfig = getRegistryMock().getConfig();
            const attributes = getFragmentAttributes({
                id: 'primary__at__primary',
                appProps: {},
                wrapperConf: null,
                url: 'http://apps.test/primary',
                ...overrides,
            });
            const request: any = { registryConfig, ilcState: {}, host: 'apps.test' };
            request.router = new ServerRouter(logger, request, '/primary');

            const warn = sinon.spy();
            const processResponse = sinon.spy();
            const run = requestFragmentSetup(
                filterHeadersMock,
                processResponse,
                { warn, debug: () => {} },
                {
                    maxRequestSize: 200,
                },
            );

            let rejected;
            try {
                await run(attributes.url, attributes, request);
            } catch (error: any) {
                rejected = error;
            }

            return { rejected, warn, response: processResponse.firstCall && processResponse.firstCall.args[0] };
        };

        it('should answer 431 for a suppressed primary fragment that cannot render client-side', async () => {
            // Q-001: with no client bundle the slot cannot be filled, so a 200 would report
            // success for a page that has no main content. 431 stays under 500, which
            // process-fragment-response passes through for a primary fragment, so the page
            // reports the truth without entering the fragment ERROR path.
            const { rejected, warn, response } = await suppressedResponse({
                spaBundleUrl: undefined,
                primary: true,
            });

            chai.expect(rejected).to.be.equal(undefined);
            chai.expect(response.statusCode).to.be.equal(431);
            chai.expect(warn.calledOnce).to.be.equal(true);
        });

        it('should answer 200 for a suppressed primary fragment that can render client-side', async () => {
            const { rejected, response } = await suppressedResponse({
                spaBundleUrl: 'http://apps.test/bundle.js',
                primary: true,
            });

            chai.expect(rejected).to.be.equal(undefined);
            chai.expect(response.statusCode).to.be.equal(200);
        });

        it('should answer 200 for a suppressed non-primary fragment without a bundle', async () => {
            // A non-primary slot is not the page's main content, so a blank slot is the
            // degradation AC-003 asks for and the page status must stay untouched.
            const { rejected, response } = await suppressedResponse({
                spaBundleUrl: undefined,
                primary: false,
            });

            chai.expect(rejected).to.be.equal(undefined);
            chai.expect(response.statusCode).to.be.equal(200);
        });

        it('should still dispatch when the size is exactly at the limit', async () => {
            const { attributes, request } = buildRequest();

            // Learn the real size from a run that is guaranteed to be over the limit,
            // then re-run with the limit set to exactly that size. The guard trips on
            // "greater than", so this is the just-under-limit boundary.
            const probe = buildFragment(1);
            await probe.requestFragmentWithLimit(attributes.url, attributes, request);
            const exactSize = probe.warn.firstCall.args[0].size;

            const mockRequestScope = nock('http://apps.test').get('/primary').query(true).reply(200);
            const { warn, processResponse, requestFragmentWithLimit } = buildFragment(exactSize);

            await requestFragmentWithLimit(attributes.url, attributes, request);

            mockRequestScope.done();
            chai.expect(warn.called).to.be.equal(false);
            chai.expect(processResponse.calledOnce).to.be.equal(true);
        });

        it('should dispatch fragment requests as GET with no body framing', async () => {
            // The pre-flight's safety rests on this. `_implicitHeader()` freezes framing early:
            // on a request that has a body it turns `Content-Length: n` into
            // `Transfer-Encoding: chunked`, so measuring would change what goes on the wire.
            // That mutation is inert only while fragment requests stay GET with no body. This
            // test fails if makeRequest ever sends another method or a body.
            const { server, port, chunks } = await new Promise<{
                server: net.Server;
                port: number;
                chunks: Buffer[];
            }>((resolve) => {
                const received: Buffer[] = [];
                const wireServer = net.createServer((socket) => {
                    socket.on('data', (chunk) => {
                        received.push(chunk);
                        socket.end('HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok');
                    });
                });

                wireServer.listen(0, '127.0.0.1', () =>
                    resolve({
                        server: wireServer,
                        port: (wireServer.address() as net.AddressInfo).port,
                        chunks: received,
                    }),
                );
            });
            const { attributes, request } = buildRequest();
            // Guard switched off: this is about what gets dispatched, not about suppression.
            const { requestFragmentWithLimit } = buildFragment(0);

            try {
                await requestFragmentWithLimit(`http://127.0.0.1:${port}/primary`, attributes, request);
            } finally {
                server.close();
            }

            const block = Buffer.concat(chunks).toString('latin1');

            chai.expect(block).to.match(/^GET /);
            chai.expect(block).to.not.match(/^transfer-encoding:/im);
            chai.expect(block).to.not.match(/^content-length:/im);
        });

        it('should warn and stay disabled when the configured value is not a usable type', async () => {
            // null, false and [] all coerce to 0 through Number(). 0 is also the off switch, so
            // without a type check ahead of the numeric one the guard would disable itself with
            // no log line at all — which is the difference this asserts.
            for (const unusable of [null, false, []]) {
                const warn = sinon.spy();

                requestFragmentSetup(
                    filterHeadersMock,
                    sinon.spy(),
                    { warn, debug: () => {} },
                    { maxRequestSize: unusable },
                );

                chai.expect(warn.calledOnce, `${JSON.stringify(unusable)} should be rejected`).to.be.equal(true);
                chai.expect(warn.firstCall.args[0].limit).to.be.equal(0);
            }
        });

        it('should cancel a suppressed request before any macrotask boundary', async () => {
            // With an `expect` header node's constructor both renders the block and queues it
            // for sending, so the request is already dispatch-committed by the time the guard
            // measures it. Nothing reaches the fragment only because isOverSizeLimit ->
            // cancelRequest runs in the same tick: cancelling this shape one macrotask later
            // really does put it on the wire, and the WARN would then be reporting a dispatch
            // that happened. Asserting the timing rather than "no bytes arrived" keeps this
            // meaningful — with a cold connection pool no bytes arrive either way, so a
            // byte-level assertion passes even if the guard becomes asynchronous.
            const { attributes, request } = buildRequest();
            const warn = sinon.spy();

            let macrotaskElapsed = false;
            let cancelledBeforeMacrotask: boolean | null = null;
            const originalRequest = http.request;
            (http as any).request = (options: any, callback: any) => {
                const fragmentRequest = originalRequest(options, callback);
                setImmediate(() => {
                    macrotaskElapsed = true;
                });

                const originalDestroy = fragmentRequest.destroy.bind(fragmentRequest);
                (fragmentRequest as any).destroy = (...args: any[]) => {
                    if (cancelledBeforeMacrotask === null) {
                        cancelledBeforeMacrotask = !macrotaskElapsed;
                    }

                    return originalDestroy(...args);
                };

                return fragmentRequest;
            };

            try {
                const requestFragmentWithExpect = requestFragmentSetup(
                    () => ({ expect: '100-continue' }),
                    sinon.spy(),
                    { warn, debug: () => {} },
                    { maxRequestSize: 200 },
                );

                await requestFragmentWithExpect(attributes.url, attributes, request);
            } finally {
                (http as any).request = originalRequest;
            }

            // Without the first assertion this could pass because the guard never ran at all.
            chai.expect(warn.calledOnce).to.be.equal(true);
            chai.expect(cancelledBeforeMacrotask).to.be.equal(true);
        });

        it('should skip the guard with a WARN when the transport is not HTTP/1.1', async () => {
            // An HTTP/2 stream has no getHeaders() and no _header, so there is no HTTP/1.1 head to
            // measure. The guard must degrade to "switched off" rather than throw: it exists to
            // prevent a 431 for a small fraction of requests, so it must never be the reason
            // every fragment request fails. The limit here is small enough that a measurable
            // request would be suppressed, so a dispatch is what proves the skip path ran.
            const { attributes, request } = buildRequest();
            const warn = sinon.spy();
            const processResponse = sinon.spy();

            const originalRequest = http.request;
            (http as any).request = (options: any, callback: any) => {
                const realRequest = originalRequest(options, callback);
                const facade = {
                    getHeaders: undefined,
                    abort: (...args: any[]) => (realRequest as any).abort(...args),
                    destroy: (...args: any[]) => (realRequest as any).destroy(...args),
                    end: (...args: any[]) => (realRequest as any).end(...args),
                    setTimeout: (...args: any[]) => (realRequest as any).setTimeout(...args),
                    on: (...args: any[]) => {
                        (realRequest as any).on(...args);

                        return facade;
                    },
                };

                return facade;
            };

            const mockRequestScope = nock('http://apps.test').get('/primary').query(true).reply(200);

            try {
                const requestFragmentWithLimit = requestFragmentSetup(
                    filterHeadersMock,
                    processResponse,
                    { warn, debug: () => {} },
                    { maxRequestSize: 200 },
                );

                await requestFragmentWithLimit(attributes.url, attributes, request);
            } finally {
                (http as any).request = originalRequest;
            }

            mockRequestScope.done();
            chai.expect(warn.calledOnce).to.be.equal(true);
            chai.expect(warn.firstCall.args[1]).to.contain('request head could not be determined');
            chai.expect(Object.keys(warn.firstCall.args[0])).to.not.include('size');
            chai.expect(processResponse.calledOnce).to.be.equal(true);
        });

        it('should not log any cookie value, even when cookie is the largest header', async () => {
            // AC: no cookie values appear in the log line. The payload reports a header's name
            // and byte count, never its value. Asserting that with a cookie big enough to BE the
            // largest header is what makes this meaningful — it fails the moment diagnostics
            // start carrying values, which is the plausible future regression.
            const { attributes, request } = buildRequest();
            const secret = `SESSIONSECRET${'x'.repeat(900)}`;
            const warn = sinon.spy();
            const requestFragmentWithCookie = requestFragmentSetup(
                () => ({ cookie: `sess=${secret}`, 'user-agent': 'Mozilla/5.0' }),
                sinon.spy(),
                { warn, debug: () => {} },
                { maxRequestSize: 200 },
            );

            await requestFragmentWithCookie(attributes.url, attributes, request);

            chai.expect(warn.calledOnce).to.be.equal(true);

            const payload = warn.firstCall.args[0];

            // Without this the test could pass while proving nothing: the cookie has to be the
            // header the guard singles out.
            chai.expect(payload.largestHeader.name).to.be.equal('cookie');
            chai.expect(JSON.stringify(payload)).to.not.contain('SESSIONSECRET');
        });
    });
});
