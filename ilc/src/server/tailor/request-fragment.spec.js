const chai = require('chai');
const nock = require('nock');
const sinon = require('sinon');

const requestFragmentSetup = require('./request-fragment');
const ServerRouter = require('./server-router');
const { getRegistryMock } = require('../../tests/helpers');
const { getFragmentAttributes } = require('../../tests/helpers');

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
    };

    const requestFragment = requestFragmentSetup(filterHeadersMock, processFragmentResponseMock);

    afterEach(() => {
        processFragmentResponseMock.resetHistory();
        filterHeadersMock.resetHistory();
    });

    it('should request fragment with correct routerProps, appProps and required headers', async () => {

        // Initialisation

        const registryConfig = getRegistryMock().getConfig().data;

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
            ignoreInvalidSsl: false
        });

        const request = { registryConfig, ilcState: {} };
        request.router = new ServerRouter(logger, request, '/primary');

        // Expectations

        const expectedRouterProps = { basePath: '/primary', reqUrl: '/primary', 'fragmentName': 'primary__at__primary' };
        const expectedAppProps = { publicPath: 'http://apps.test/primary' };

        const expectedRouterPropsEncoded = Buffer.from(JSON.stringify(expectedRouterProps)).toString('base64');
        const expectedAppPropsEncoded = Buffer.from(JSON.stringify(expectedAppProps)).toString('base64');

        const mockRequestScope = nock('http://apps.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
            .get('/primary')
            .query({
                routerProps: expectedRouterPropsEncoded,
                appProps: expectedAppPropsEncoded,
            })
            .reply(200);

        // Processing

        await requestFragment(attributes.url, attributes, request);
        mockRequestScope.done();
        chai.expect(processFragmentResponseMock.calledOnce).to.be.equal(true);
        chai.expect(filterHeadersMock.calledOnce).to.be.equal(true);
    });

    it('should request fragment wrapper with correct routerProps, appProps and required headers', async () => {

        // Initialisation

        const registryConfig = getRegistryMock().getConfig().data;

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
            ignoreInvalidSsl: false
        });

        const request = { registryConfig, ilcState: {} };
        request.router = new ServerRouter(logger, request, '/wrapper');

        // Expectations

        const expectedRouterProps = { basePath: '/', reqUrl: '/wrapper', 'fragmentName': 'wrapper__at__primary' };
        const expectedAppProps = { param1: 'value1' };

        const expectedRouterPropsEncoded = Buffer.from(JSON.stringify(expectedRouterProps)).toString('base64');
        const expectedAppPropsEncoded = Buffer.from(JSON.stringify(expectedAppProps)).toString('base64');

        const mockRequestScope = nock('http://apps.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
            .get('/wrapper')
            .query({
                routerProps: expectedRouterPropsEncoded,
                appProps: expectedAppPropsEncoded,
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

        const registryConfig = getRegistryMock().getConfig().data;

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
            ignoreInvalidSsl: false
        });

        const request = { registryConfig, ilcState: {} };
        request.router = new ServerRouter(logger, request, '/wrapper');

        // Expectations

        const expectedWrapperRouterProps = { basePath: '/', reqUrl: '/wrapper', 'fragmentName': 'wrapper__at__primary' };
        const expectedWrapperAppProps = { param1: 'value1' };
        const wrapperPropsOverride = { param2: 'value2' };

        const expectedWrapperRouterPropsEncoded = Buffer.from(JSON.stringify(expectedWrapperRouterProps)).toString('base64');
        const expectedWrapperAppPropsEncoded = Buffer.from(JSON.stringify(expectedWrapperAppProps)).toString('base64');
        const wrapperPropsOverrideEncoded = Buffer.from(JSON.stringify(wrapperPropsOverride)).toString('base64');

        const mockRequestWrapperScope = nock('http://apps.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
            .get('/wrapper')
            .query({
                routerProps: expectedWrapperRouterPropsEncoded,
                appProps: expectedWrapperAppPropsEncoded,
            })
            .reply(210, '', { 'x-props-override': wrapperPropsOverrideEncoded });

        const expectedWrappedAppRouterProps = { basePath: '/wrapper', reqUrl: '/wrapper', fragmentName: 'wrapperApp__at__primary' };
        // returned props from wrapper must be overrode for wrapped application
        const expectedWrappedAppAppProps = { page: 'wrapped', param2: 'value2' };

        const expectedWrappedAppRouterPropsEncoded = Buffer.from(JSON.stringify(expectedWrappedAppRouterProps)).toString('base64');
        const expectedWrappedAppAppPropsEncoded = Buffer.from(JSON.stringify(expectedWrappedAppAppProps)).toString('base64');

        const mockRequestWrappedAppScope = nock('http://apps.test', { reqheaders: { 'accept-encoding': 'gzip, deflate' } })
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

})
