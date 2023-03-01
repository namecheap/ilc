const chai = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const _ = require('lodash');

const { intlSchema } = require('ilc-sdk/dist/server/IlcProtocol'); // "Private" import

const i18n = require('./i18n');
const createApp = require('./app');
const helpers = require('../tests/helpers');
const { context } = require('./context/context');

const i18nConfig = Object.freeze({
    enabled: true,
    default: { locale: 'en-US', currency: 'USD' },
    supported: {
        locale: ['en-US', 'ua-UA'],
        currency: ['USD', 'UAH'],
    },
    routingStrategy: 'prefix_except_default',
});

const i18nParamsDetectionPlugin = Object.freeze({
    detectI18nConfig: sinon.stub(),
});

const pluginManager = Object.freeze({
    ...helpers.getPluginManagerMock(),
    getI18nParamsDetectionPlugin: sinon.stub(),
});

const getApp = () => createApp(helpers.getRegistryMock(), pluginManager, context);

const decodeIntlHeader = (headerValue) =>
    JSON.parse(JSON.stringify(intlSchema.fromBuffer(Buffer.from(headerValue, 'base64'), undefined, true)));

const expectedHeader = (currentOverride = i18nConfig.default) => ({
    current: currentOverride,
    default: i18nConfig.default,
    supported: i18nConfig.supported,
    routingStrategy: i18nConfig.routingStrategy,
});

describe('i18n', () => {
    before(() => {
        helpers.setupMockServersForApps();
    });

    after(() => {
        nock.cleanAll();
    });

    afterEach(() => {
        i18nParamsDetectionPlugin.detectI18nConfig.reset();
        pluginManager.getI18nParamsDetectionPlugin.reset();
    });

    describe('E2E tests', () => {
        beforeEach(() => {
            pluginManager.getI18nParamsDetectionPlugin.withArgs().onFirstCall().returns(i18nParamsDetectionPlugin);
        });

        it('default locale: should correctly render & pass to the fragments locale info', async () => {
            const detectedI18nConfig = {
                locale: 'en-US',
                currency: 'UAH',
            };

            i18nParamsDetectionPlugin.detectI18nConfig.onFirstCall().returns(detectedI18nConfig);

            const app = getApp();

            const response = await app.inject({ method: 'GET', url: '/all' });

            chai.expect(response.statusCode).to.eq(200);
            chai.expect(response.body).to.contain('<html lang="en-US">');

            const fragmentResps = helpers.getFragmentResponses(response.body);
            _.each(fragmentResps, (v) => {
                chai.expect(decodeIntlHeader(v.headers['x-request-intl'])).to.eql(expectedHeader(detectedI18nConfig));
                chai.expect(helpers.getRouterProps(v.url).reqUrl).to.eq('/all');
            });
        });

        it('ua: should correctly render & pass to the fragments locale info', async () => {
            const detectedI18nConfig = {
                locale: 'ua-UA',
                currency: 'USD',
            };

            i18nParamsDetectionPlugin.detectI18nConfig.onFirstCall().returns(detectedI18nConfig);

            const app = getApp();

            const response = await app.inject({ method: 'GET', url: '/ua/all' });

            chai.expect(response.statusCode).to.eq(200);
            chai.expect(response.body).to.contain('<html lang="ua-UA">');

            const fragmentResps = helpers.getFragmentResponses(response.body);
            _.each(fragmentResps, (v) => {
                chai.expect(decodeIntlHeader(v.headers['x-request-intl'])).to.eql(expectedHeader(detectedI18nConfig));
                chai.expect(helpers.getRouterProps(v.url).reqUrl).to.eq('/all');
            });
        });
    });

    describe('Unit tests', () => {
        let onRequest, reply;
        beforeEach(() => {
            onRequest = i18n.onRequestFactory(i18nConfig, i18nParamsDetectionPlugin);
            reply = getReplyMock();
        });

        describe('detect locale by i18n params detection plugin', () => {
            it('ua-UA, redirects to URL with correct lang code', async () => {
                const detectedI18nConfig = {
                    locale: 'ua-UA',
                    currency: 'UAH',
                };

                i18nParamsDetectionPlugin.detectI18nConfig.onFirstCall().returns(detectedI18nConfig);

                const req = getReqMock('/en-US/test');

                await onRequest(req, reply);

                const [providedReqRaw, providedIntl, providedI18nConfig] =
                    i18nParamsDetectionPlugin.detectI18nConfig.getCalls()[0].args;

                chai.expect(providedReqRaw).to.be.eql(req.raw);
                chai.expect(providedIntl).to.have.keys(['parseUrl', 'localizeUrl', 'getCanonicalLocale']);
                chai.expect(providedI18nConfig).to.be.eql(i18nConfig.default);

                sinon.assert.calledWithExactly(reply.redirect, '/ua/test');
            });

            it('ua-ua, redirects to URL with correct lang code', async () => {
                const detectedI18nConfig = {
                    locale: 'ua-ua',
                    currency: 'UAH',
                };

                i18nParamsDetectionPlugin.detectI18nConfig.onFirstCall().returns(detectedI18nConfig);

                const req = getReqMock('/en-US/test');

                await onRequest(req, reply);

                const [providedReqRaw, providedIntl, providedI18nConfig] =
                    i18nParamsDetectionPlugin.detectI18nConfig.getCalls()[0].args;

                chai.expect(providedReqRaw).to.be.eql(req.raw);
                chai.expect(providedIntl).to.have.keys(['parseUrl', 'localizeUrl', 'getCanonicalLocale']);
                chai.expect(providedI18nConfig).to.be.eql(i18nConfig.default);

                sinon.assert.calledOnceWithExactly(reply.redirect, '/ua/test');
            });

            it('ua, forwards locale to apps & sets intl cookie', async () => {
                const detectedI18nConfig = {
                    locale: 'ua-UA',
                    currency: 'UAH',
                };

                i18nParamsDetectionPlugin.detectI18nConfig.onFirstCall().returns(detectedI18nConfig);

                const req = getReqMock('/ua/test');

                await onRequest(req, reply);

                chai.expect(req.raw.url).to.be.eql('/ua/test');
                chai.expect(req.raw.ilcState.locale).to.be.eql(detectedI18nConfig.locale);
                chai.expect(decodeIntlHeader(req.headers['x-request-intl'])).to.eql(expectedHeader(detectedI18nConfig));

                const [providedReqRaw, providedIntl, providedI18nConfig] =
                    i18nParamsDetectionPlugin.detectI18nConfig.getCalls()[0].args;

                chai.expect(providedReqRaw).to.be.eql(req.raw);
                chai.expect(providedIntl).to.have.keys(['parseUrl', 'localizeUrl', 'getCanonicalLocale']);
                chai.expect(providedI18nConfig).to.be.eql(i18nConfig.default);

                sinon.assert.calledWith(
                    reply.res.setHeader,
                    'Set-Cookie',
                    sinon.match(`ilc-i18n=${detectedI18nConfig.locale}%3A${detectedI18nConfig.currency}; Path=/;`),
                );
            });

            describe('handles default locale with redirect', () => {
                it('en-US', async () => {
                    const detectedI18nConfig = {
                        locale: 'en-US',
                        currency: 'USD',
                    };

                    i18nParamsDetectionPlugin.detectI18nConfig.onFirstCall().returns(detectedI18nConfig);

                    const req = getReqMock('/ua/test');

                    await onRequest(req, reply);

                    const [providedReqRaw, providedIntl, providedI18nConfig] =
                        i18nParamsDetectionPlugin.detectI18nConfig.getCalls()[0].args;

                    chai.expect(providedReqRaw).to.be.eql(req.raw);
                    chai.expect(providedIntl).to.have.keys(['parseUrl', 'localizeUrl', 'getCanonicalLocale']);
                    chai.expect(providedI18nConfig).to.be.eql(i18nConfig.default);

                    sinon.assert.calledWith(reply.redirect, '/test');
                });

                it('en-us', async () => {
                    const detectedI18nConfig = {
                        locale: 'en-us',
                        currency: 'USD',
                    };

                    i18nParamsDetectionPlugin.detectI18nConfig.onFirstCall().returns(detectedI18nConfig);

                    const req = getReqMock('/ua/test');

                    await onRequest(req, reply);

                    const [providedReqRaw, providedIntl, providedI18nConfig] =
                        i18nParamsDetectionPlugin.detectI18nConfig.getCalls()[0].args;

                    chai.expect(providedReqRaw).to.be.eql(req.raw);
                    chai.expect(providedIntl).to.have.keys(['parseUrl', 'localizeUrl', 'getCanonicalLocale']);
                    chai.expect(providedI18nConfig).to.be.eql(i18nConfig.default);

                    sinon.assert.calledWith(reply.redirect, '/test');
                });

                it('en', async () => {
                    const detectedI18nConfig = {
                        locale: 'en',
                        currency: 'USD',
                    };

                    i18nParamsDetectionPlugin.detectI18nConfig.onFirstCall().returns(detectedI18nConfig);

                    const req = getReqMock('/ua/test');

                    await onRequest(req, reply);

                    const [providedReqRaw, providedIntl, providedI18nConfig] =
                        i18nParamsDetectionPlugin.detectI18nConfig.getCalls()[0].args;

                    chai.expect(providedReqRaw).to.be.eql(req.raw);
                    chai.expect(providedIntl).to.have.keys(['parseUrl', 'localizeUrl', 'getCanonicalLocale']);
                    chai.expect(providedI18nConfig).to.be.eql(i18nConfig.default);

                    sinon.assert.calledWith(reply.redirect, '/test');
                });
            });
        });

        describe('should not use detected locale from cookie', () => {
            it('ua-UA, detects locale & performs redirect to localized URL', async () => {
                const detectedI18nConfig = {
                    locale: 'ua-UA',
                    currency: 'UAH',
                };

                const cookiesI18nConfig = {
                    currency: 'EUR',
                    locale: 'en-GB',
                };

                i18nParamsDetectionPlugin.detectI18nConfig.onFirstCall().returns(detectedI18nConfig);

                const req = getReqMock('/test', `ilc-i18n=${cookiesI18nConfig.locale}:${cookiesI18nConfig.currency};`);

                await onRequest(req, reply);

                const [providedReqRaw, providedIntl, providedI18nConfig] =
                    i18nParamsDetectionPlugin.detectI18nConfig.getCalls()[0].args;

                chai.expect(providedReqRaw).to.be.eql(req.raw);
                chai.expect(providedIntl).to.have.keys(['parseUrl', 'localizeUrl', 'getCanonicalLocale']);
                chai.expect(providedI18nConfig).to.be.eql(i18nConfig.default);

                sinon.assert.calledWith(reply.redirect, '/ua/test');
            });

            it('handles default locale correctly, without redirect', async () => {
                const detectedI18nConfig = {
                    locale: 'en-US',
                    currency: 'USD',
                };

                const cookiesI18nConfig = {
                    currency: 'UAH',
                    locale: 'ua-UA',
                };

                i18nParamsDetectionPlugin.detectI18nConfig.onFirstCall().returns(detectedI18nConfig);

                const req = getReqMock('/test', `ilc-i18n=${cookiesI18nConfig.locale}:${cookiesI18nConfig.currency};`);

                await onRequest(req, reply);

                const [providedReqRaw, providedIntl, providedI18nConfig] =
                    i18nParamsDetectionPlugin.detectI18nConfig.getCalls()[0].args;

                chai.expect(providedReqRaw).to.be.eql(req.raw);
                chai.expect(providedIntl).to.have.keys(['parseUrl', 'localizeUrl', 'getCanonicalLocale']);
                chai.expect(providedI18nConfig).to.be.eql(cookiesI18nConfig);

                sinon.assert.notCalled(reply.redirect);

                chai.expect(req.raw.url).to.be.eql('/test');
                chai.expect(req.raw.ilcState.locale).to.be.eql('en-US');
            });

            it('handles incorrect cookie locale correctly, without failure', async () => {
                const detectedI18nConfig = {
                    locale: 'en-US',
                    currency: 'USD',
                };

                i18nParamsDetectionPlugin.detectI18nConfig.onFirstCall().returns(detectedI18nConfig);

                const req = getReqMock('/test', `ilc-i18n=fasdfasfsadfsa;`);

                await onRequest(req, reply);

                const [providedReqRaw, providedIntl, providedI18nConfig] =
                    i18nParamsDetectionPlugin.detectI18nConfig.getCalls()[0].args;

                chai.expect(providedReqRaw).to.be.eql(req.raw);
                chai.expect(providedIntl).to.have.keys(['parseUrl', 'localizeUrl', 'getCanonicalLocale']);
                chai.expect(providedI18nConfig).to.be.eql(detectedI18nConfig);

                sinon.assert.notCalled(reply.redirect);

                chai.expect(req.raw.url).to.be.eql('/test');
                chai.expect(req.raw.ilcState.locale).to.be.eql('en-US');
            });
        });
    });
});

function getReqMock(url = '/test', cookieString = '') {
    return {
        raw: { url: url, ilcState: {} },
        headers: { cookie: cookieString },
    };
}

function getReplyMock() {
    return {
        redirect: sinon.stub(),
        res: { setHeader: sinon.stub() },
    };
}
