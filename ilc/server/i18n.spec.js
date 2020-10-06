const chai = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const _ = require('lodash');

const i18n = require('./i18n');
const createApp = require('./app');
const helpers = require('../tests/helpers');

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
                chai.expect(v.headers['z-intl']).to.eq('en-US:en-US:en-US,en-GB,fr-FR,fr-CA,de-DE;USD:USD:USD,EUR,GBP;');
                chai.expect(helpers.getRouterProps(v.url).reqUrl).to.eq('/all');
            });
        });

        it('fr-FR: should correctly render & pass to the fragments locale info', async () => {
            const app = createApp(helpers.getRegistryMock());

            const response = await app.inject({ method: 'GET', url: '/fr-FR/all' });

            chai.expect(response.statusCode).to.eq(200);
            chai.expect(response.body).to.contain('<html lang="fr-FR">');

            const fragmentResps = helpers.getFragmentResponses(response.body);
            _.each(fragmentResps, v => {
                chai.expect(v.headers['z-intl']).to.eq('fr-FR:en-US:en-US,en-GB,fr-FR,fr-CA,de-DE;USD:USD:USD,EUR,GBP;');
                chai.expect(helpers.getRouterProps(v.url).reqUrl).to.eq('/all');
            });
        });
    });

    describe('Unit tests', () => {
        describe('Detect locale from localized URL', () => {
            it('fr-FR', async () => {
                const req = getReqMock('/fr-FR/test');
                const reply = getReplyMock();

                await i18n.onRequest(req, reply, () => {});

                chai.expect(req.url).to.be.eql('/test');
                chai.expect(req.ilcState.locale).to.be.eql('fr-FR');
                chai.expect(req.headers['z-intl']).to.be.eql('fr-FR:en-US:en-US,en-GB,fr-FR,fr-CA,de-DE;USD:USD:USD,EUR,GBP;');
            });

            it('fr-fr', async () => {
                const req = getReqMock('/fr-fr/test');
                const reply = getReplyMock();

                await i18n.onRequest(req, reply, () => {});

                chai.expect(req.url).to.be.eql('/test');
                chai.expect(req.ilcState.locale).to.be.eql('fr-FR');
                chai.expect(req.headers['z-intl']).to.be.eql('fr-FR:en-US:en-US,en-GB,fr-FR,fr-CA,de-DE;USD:USD:USD,EUR,GBP;');
            });

            it('fr', async () => {
                const req = getReqMock('/fr/test');
                const reply = getReplyMock();

                await i18n.onRequest(req, reply, () => {});

                chai.expect(req.url).to.be.eql('/test');
                chai.expect(req.ilcState.locale).to.be.eql('fr-FR');
                chai.expect(req.headers['z-intl']).to.be.eql('fr-FR:en-US:en-US,en-GB,fr-FR,fr-CA,de-DE;USD:USD:USD,EUR,GBP;');
            });

            it('bd-SM, ignores invalid locale and fallback to the default one', async () => {
                const req = getReqMock('/bd-SM/test');
                const reply = getReplyMock();

                await i18n.onRequest(req, reply, () => {});

                chai.expect(req.url).to.be.eql('/bd-SM/test');
                chai.expect(req.ilcState.locale).to.be.eql('en-US');
                chai.expect(req.headers['z-intl']).to.be.eql('en-US:en-US:en-US,en-GB,fr-FR,fr-CA,de-DE;USD:USD:USD,EUR,GBP;');
            });

            it('handles default locale with redirect', async () => {
                const req = getReqMock('/en-US/test');
                const reply = getReplyMock();

                await i18n.onRequest(req, reply, () => {});

                sinon.assert.calledWith(reply.redirect, '/test');
            });
        });

        describe('Detect locale from cookie', () => {
            it('fr-FR', async () => {
                const req = getReqMock('/test', 'lang=fr-FR;');
                const reply = getReplyMock();

                await i18n.onRequest(req, reply, () => {});

                sinon.assert.calledWith(reply.redirect, '/fr-FR/test');
            });

            it('handles default locale correctly, without redirect', async () => {
                const req = getReqMock('/test', 'lang=en-US;');
                const reply = getReplyMock();

                await i18n.onRequest(req, reply, () => {});

                sinon.assert.notCalled(reply.redirect);
                chai.expect(req.url).to.be.eql('/test');
                chai.expect(req.ilcState.locale).to.be.eql('en-US');
                chai.expect(req.headers['z-intl']).to.be.eql('en-US:en-US:en-US,en-GB,fr-FR,fr-CA,de-DE;USD:USD:USD,EUR,GBP;');
            });

            it('bd-SM, ignores invalid locale and fallback to the default one', async () => {
                const req = getReqMock('/test', 'lang=bd-SM;');
                const reply = getReplyMock();

                await i18n.onRequest(req, reply, () => {});

                chai.expect(req.url).to.be.eql('/test');
                chai.expect(req.ilcState.locale).to.be.eql('en-US');
                chai.expect(req.headers['z-intl']).to.be.eql('en-US:en-US:en-US,en-GB,fr-FR,fr-CA,de-DE;USD:USD:USD,EUR,GBP;');
            });
        });
    });
});

function getReqMock(url = '/test', cookieString = '') {
    return {
        url: url,
        ilcState: {},
        headers: { cookie: cookieString },
    };
}

function getReplyMock() {
    return {
        redirect: sinon.stub(),
    }
}
