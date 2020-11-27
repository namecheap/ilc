const chai = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const _ = require('lodash');

const i18n = require('./i18n');
const createApp = require('./app');
const helpers = require('../tests/helpers');
const {intlSchema} = require('ilc-sdk/dist/server/IlcProtocol'); //"Private" import

const i18nConfig = Object.freeze({
    enabled: true,
    default: { locale: 'en-US', currency: 'USD' },
    supported: {
        locale: ['en-US', 'ua-UA'],
        currency: ['USD', 'UAH']
    },
    routingStrategy: 'prefix_except_default',
});

const getApp = () => createApp(helpers.getRegistryMock({
    settings: { i18n: i18nConfig }
}));

const decodeIntlHeader = headerValue =>
    JSON.parse(JSON.stringify(intlSchema.fromBuffer(Buffer.from(headerValue, 'base64'), undefined, true)));

const expectedHeader = (currentOverride = i18nConfig.default) => ({
    current: currentOverride,
    default: i18nConfig.default,
    supported: i18nConfig.supported,
    routingStrategy: i18nConfig.routingStrategy,
});

nock('http://apps.test')
    .persist(true)
    .get(/.?/)
    .reply(200, function (uri) {
        return JSON.stringify({
            url: uri,
            headers: this.req.headers,
        })
    });

describe('i18n', () => {
    after(() => {
        nock.cleanAll();
        nock.restore();
    });

    describe('E2E tests', () => {
        it('default locale: should correctly render & pass to the fragments locale info', async () => {
            const app = getApp();

            const response = await app.inject({ method: 'GET', url: '/all' });

            chai.expect(response.statusCode).to.eq(200);
            chai.expect(response.body).to.contain('<html lang="en-US">');

            const fragmentResps = helpers.getFragmentResponses(response.body);
            _.each(fragmentResps, v => {
                chai.expect(decodeIntlHeader(v.headers['x-request-intl'])).to.eql(expectedHeader());
                chai.expect(helpers.getRouterProps(v.url).reqUrl).to.eq('/all');
            });
        });

        it('ua: should correctly render & pass to the fragments locale info', async () => {
            const app = getApp();

            const response = await app.inject({ method: 'GET', url: '/ua/all' });

            chai.expect(response.statusCode).to.eq(200);
            chai.expect(response.body).to.contain('<html lang="ua-UA">');

            const fragmentResps = helpers.getFragmentResponses(response.body);
            _.each(fragmentResps, v => {
                chai.expect(decodeIntlHeader(v.headers['x-request-intl']))
                    .to.eql(expectedHeader({locale: 'ua-UA', currency: 'USD'}));
                chai.expect(helpers.getRouterProps(v.url).reqUrl).to.eq('/all');
            });
        });
    });

    describe('Unit tests', () => {
        let onRequest, reply;

        beforeEach(() => {
            onRequest = i18n.onRequestFactory(i18nConfig);
            reply = getReplyMock();
        })

        describe('Detect locale from localized URL', () => {
            it('ua-UA, Redirects to URL with correct lang code', async () => {
                const req = getReqMock('/ua-UA/test');

                await onRequest(req, reply);

                sinon.assert.calledWith(reply.redirect, '/ua/test');
            });

            it('ua-ua, Redirects to URL with correct lang code', async () => {
                const req = getReqMock('/ua-ua/test');

                await onRequest(req, reply);

                sinon.assert.calledWith(reply.redirect, '/ua/test');
            });

            it('ua, Forwards locale to apps & sets intl cookie', async () => {
                const req = getReqMock('/ua/test');

                await onRequest(req, reply);

                chai.expect(req.raw.url).to.be.eql('/ua/test');
                chai.expect(req.raw.ilcState.locale).to.be.eql('ua-UA');
                chai.expect(decodeIntlHeader(req.headers['x-request-intl']))
                    .to.eql(expectedHeader({locale: 'ua-UA', currency: 'USD'}));

                sinon.assert.calledWith(reply.res.setHeader, 'Set-Cookie', sinon.match('ilc-i18n=ua-UA%3AUSD; Path=/;'));
            });

            it('bd-SM, ignores invalid locale and fallback to the default one', async () => {
                const req = getReqMock('/bd-SM/test');

                await onRequest(req, reply);

                chai.expect(req.raw.url).to.be.eql('/bd-SM/test');
                chai.expect(req.raw.ilcState.locale).to.be.eql('en-US');
                chai.expect(decodeIntlHeader(req.headers['x-request-intl']))
                    .to.eql(expectedHeader());
            });

            describe('handles default locale with redirect', () => {
                it('en-US', async () => {
                    const req = getReqMock('/en-US/test');

                    await onRequest(req, reply);

                    sinon.assert.calledWith(reply.redirect, '/test');
                });

                it('en-us', async () => {
                    const req = getReqMock('/en-us/test');

                    await onRequest(req, reply);

                    sinon.assert.calledWith(reply.redirect, '/test');
                });

                it('en', async () => {
                    const req = getReqMock('/en/test');

                    await onRequest(req, reply);

                    sinon.assert.calledWith(reply.redirect, '/test');
                });
            })

        });

        describe('Detect locale from cookie', () => {
            it('ua-UA, detects locale & performs redirect to localized URL', async () => {
                const req = getReqMock('/test', 'ilc-i18n=ua-UA:UAH;');

                await onRequest(req, reply);

                sinon.assert.calledWith(reply.redirect, '/ua/test');
            });

            it('handles default locale correctly, without redirect', async () => {
                const req = getReqMock('/test', 'ilc-i18n=en-US:USD;');

                await onRequest(req, reply);

                sinon.assert.notCalled(reply.redirect);
                chai.expect(req.raw.url).to.be.eql('/test');
                chai.expect(req.raw.ilcState.locale).to.be.eql('en-US');
            });

            it('bd-SM, ignores invalid locale and fallback to the default one', async () => {
                const req = getReqMock('/test', 'ilc-i18n=bd-SM:BLH;');

                await onRequest(req, reply);

                chai.expect(req.raw.url).to.be.eql('/test');
                chai.expect(req.raw.ilcState.locale).to.be.eql('en-US');
            });
        });
    });
});

function getReqMock(url = '/test', cookieString = '') {
    return {
        raw: {url: url, ilcState: {}},
        headers: { cookie: cookieString },
    };
}

function getReplyMock() {
    return {
        redirect: sinon.stub(),
        res: { setHeader: sinon.stub() }
    }
}
