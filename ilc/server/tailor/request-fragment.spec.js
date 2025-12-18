const chai = require('chai');
const nock = require('nock');
const sinon = require('sinon');

const requestFragmentSetup = require('./request-fragment');
const ServerRouter = require('./server-router');
const { getRegistryMock } = require('../../tests/helpers');
const { getFragmentAttributes } = require('../../tests/helpers');
const errors = require('./errors');

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

        const request = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request, '/primary');

        // Expectations

        const expectedRouterProps = { basePath: '/primary', reqUrl: '/primary', fragmentName: 'primary__at__primary' };
        const expectedAppProps = { publicPath: 'http://apps.test/primary' };
        const expectedSdkOptions = { i18n: { manifestPath: '/l10n/primary/manifest.json' } };

        const expectedDomain = request.host;
        const expectedRouterPropsEncoded = Buffer.from(JSON.stringify(expectedRouterProps)).toString('base64');
        const expectedAppPropsEncoded = Buffer.from(JSON.stringify(expectedAppProps)).toString('base64');
        const expectedSdkEncoded = Buffer.from(JSON.stringify(expectedSdkOptions)).toString('base64');

        const mockRequestScope = nock('http://apps.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
            .get('/primary')
            .query({
                domain: expectedDomain,
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

        const request = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request, '/wrapper');

        // Expectations

        const expectedRouterProps = { basePath: '/', reqUrl: '/wrapper', fragmentName: 'wrapper__at__primary' };
        const expectedAppProps = { param1: 'value1' };
        const wrappedAppProps = { page: 'wrapped' };

        const expectedDomain = request.host;
        const expectedRouterPropsEncoded = Buffer.from(JSON.stringify(expectedRouterProps)).toString('base64');
        const expectedAppPropsEncoded = Buffer.from(JSON.stringify(expectedAppProps)).toString('base64');
        const expectedWrappedAppPropsEncoded = Buffer.from(JSON.stringify(wrappedAppProps)).toString('base64');

        const mockRequestScope = nock('http://apps.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
            .get('/wrapper')
            .query({
                domain: expectedDomain,
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

        const request = {
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

        const expectedDomain = request.host;
        const expectedWrapperRouterPropsEncoded = Buffer.from(JSON.stringify(expectedWrapperRouterProps)).toString(
            'base64',
        );
        const expectedWrapperAppPropsEncoded = Buffer.from(JSON.stringify(expectedWrapperAppProps)).toString('base64');
        const wrapperPropsOverrideEncoded = Buffer.from(JSON.stringify(wrapperPropsOverride)).toString('base64');
        const expectedWrappedAppPropsEncoded = Buffer.from(JSON.stringify(wrappedAppProps)).toString('base64');

        const mockRequestWrapperScope = nock('http://apps.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
            .get('/wrapper')
            .query({
                domain: expectedDomain,
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
                domain: expectedDomain,
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

        const request = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request, '/primary');

        // Expectations

        const expectedRouterProps = { basePath: '/primary', reqUrl: '/primary', fragmentName: 'primary__at__primary' };
        const expectedAppProps = { publicPath: 'http://apps.test/primary' };
        const expectedSdkOptions = { i18n: { manifestPath: '/l10n/primary/manifest.json' } };

        const expectedDomain = request.host;
        const expectedRouterPropsEncoded = Buffer.from(JSON.stringify(expectedRouterProps)).toString('base64');
        const expectedAppPropsEncoded = Buffer.from(JSON.stringify(expectedAppProps)).toString('base64');
        const expectedSdkEncoded = Buffer.from(JSON.stringify(expectedSdkOptions)).toString('base64');

        const mockRequestScope = nock('http://apps.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
            .get('/primary')
            .query({
                domain: expectedDomain,
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
        } catch (e) {
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

        const request = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request, '/primary');

        const networkError = new Error('Network error');
        networkError.code = 'ECONNREFUSED';

        const mockRequestScope = nock('http://apps.test').get('/primary').query(true).replyWithError(networkError);

        try {
            await requestFragment(attributes.url, attributes, request);
            mockRequestScope.done();
            chai.expect.fail('This code should not be reached, because error expected to be thrown above');
        } catch (e) {
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

        const request = {
            registryConfig,
            ilcState: {},
            host: 'apps.test',
        };
        request.router = new ServerRouter(logger, request, '/wrapper');

        const networkError = new Error('Network error');
        networkError.code = 'ECONNREFUSED';

        const mockRequestScope = nock('http://apps.test').get('/wrapper').query(true).replyWithError(networkError);

        try {
            await requestFragment(attributes.url, attributes, request);
            mockRequestScope.done();
            chai.expect.fail('This code should not be reached, because error expected to be thrown above');
        } catch (e) {
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

        const request = {
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

        const request = {
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
});
