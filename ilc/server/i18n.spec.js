const chai = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const _ = require('lodash');

const i18n = require('./i18n');
const createApp = require('./app');
const helpers = require('../tests/helpers');

const i18nConfig = Object.freeze({
    enabled: true,
    default: { locale: 'en-US', currency: 'USD' },
    supported: {
        locale: ['en-US', 'ua-UA'],
        currency: ['USD', 'UAH']
    },
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
            const app = createApp(helpers.getRegistryMock());

            const response = await app.inject({ method: 'GET', url: '/all' });

            chai.expect(response.statusCode).to.eq(200);
            chai.expect(response.body).to.contain('<html lang="en-US">');

            const fragmentResps = helpers.getFragmentResponses(response.body);
            _.each(fragmentResps, v => {
                chai.expect(v.headers['x-request-intl']).to.eq('en-US:en-US:en-US,ua-UA;USD:USD:USD,UAH;');
                chai.expect(helpers.getRouterProps(v.url).reqUrl).to.eq('/all');
            });
        });

        it('ua: should correctly render & pass to the fragments locale info', async () => {
            const app = createApp(helpers.getRegistryMock());

            const response = await app.inject({ method: 'GET', url: '/ua/all' });

            chai.expect(response.statusCode).to.eq(200);
            chai.expect(response.body).to.contain('<html lang="ua-UA">');

            const fragmentResps = helpers.getFragmentResponses(response.body);
            _.each(fragmentResps, v => {
                chai.expect(v.headers['x-request-intl']).to.eq('ua-UA:en-US:en-US,ua-UA;USD:USD:USD,UAH;');
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

            it('ua, Forwards locale to apps', async () => {
                const req = getReqMock('/ua/test');

                await onRequest(req, reply);

                chai.expect(req.raw.url).to.be.eql('/ua/test');
                chai.expect(req.raw.ilcState.locale).to.be.eql('ua-UA');
                chai.expect(req.headers['x-request-intl']).to.be.eql('ua-UA:en-US:en-US,ua-UA;USD:USD:USD,UAH;');
            });

            it('bd-SM, ignores invalid locale and fallback to the default one', async () => {
                const req = getReqMock('/bd-SM/test');

                await onRequest(req, reply);

                chai.expect(req.raw.url).to.be.eql('/bd-SM/test');
                chai.expect(req.raw.ilcState.locale).to.be.eql('en-US');
                chai.expect(req.headers['x-request-intl']).to.be.eql('en-US:en-US:en-US,ua-UA;USD:USD:USD,UAH;');
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
                const req = getReqMock('/test', 'lang=ua-UA;');

                await onRequest(req, reply);

                sinon.assert.calledWith(reply.redirect, '/ua/test');
            });

            it('handles default locale correctly, without redirect', async () => {
                const req = getReqMock('/test', 'lang=en-US;');

                await onRequest(req, reply);

                sinon.assert.notCalled(reply.redirect);
                chai.expect(req.raw.url).to.be.eql('/test');
                chai.expect(req.raw.ilcState.locale).to.be.eql('en-US');
                chai.expect(req.headers['x-request-intl']).to.be.eql('en-US:en-US:en-US,ua-UA;USD:USD:USD,UAH;');
            });

            it('bd-SM, ignores invalid locale and fallback to the default one', async () => {
                const req = getReqMock('/test', 'lang=bd-SM;');

                await onRequest(req, reply);

                chai.expect(req.raw.url).to.be.eql('/test');
                chai.expect(req.raw.ilcState.locale).to.be.eql('en-US');
                chai.expect(req.headers['x-request-intl']).to.be.eql('en-US:en-US:en-US,ua-UA;USD:USD:USD,UAH;');
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
    }
}
