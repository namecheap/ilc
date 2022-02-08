const chai = require('chai');
const supertest = require('supertest');
const nock = require('nock');
const config = require('config');

const localStorage = require('../../common/localStorage');
const helpers = require('../../tests/helpers');

const createApp = require('../app');

describe('ErrorHandler', () => {
    const errorIdRegExp = /(?<errorId>[\d\w]{8}-[\d\w]{4}-[\d\w]{4}-[\d\w]{4}-[\d\w]{12})/;

    let app;
    let server;

    before(async () => {
        app = createApp(helpers.getRegistryMock(), helpers.getPluginManagerMock());
        await app.ready();
        server = supertest(app.server);
    });

    afterEach(() => {
        localStorage.clear();
    });

    after(() => {
        app.close();
    });

    it('should show 500 error page with an error id', async () => {
        nock(config.get('registry').address).get('/api/v1/router_domains').reply(200, []);
        nock(config.get('registry').address).get(`/api/v1/template/500/rendered`).reply(200, {
            content:
                '<html>' +
                '<body>' +
                '<main>' +
                '<h1>Hello there!</h1>' +
                '<div>%ERRORID%</div>' +
                '</main>' +
                '</body>' +
                '</html>',
        });

        const response = await server.get('/_ilc/500').expect(500);
        const {errorId} = response.text.match(errorIdRegExp).groups;

        chai.expect(response.header['cache-control']).to.be.eql('no-cache, no-store, must-revalidate');
        chai.expect(response.header['pragma']).to.be.eql('no-cache');
        chai.expect(response.text).to.be.eql(
            '<html>' +
            '<body>' +
            '<main>' +
            '<h1>Hello there!</h1>' +
            `<div>Error ID: ${errorId}</div>` +
            '</main>' +
            '</body>' +
            '</html>'
        );
    });

    it('should send an error message when showing 500 error page throws an error', async () => {
        nock(config.get('registry').address).get('/api/v1/router_domains').reply(200, []);
        const replyingError = new Error('Something awful happened.');

        nock(config.get('registry').address).get(`/api/v1/template/500/rendered`).replyWithError(replyingError.message);

        const response = await server.get('/_ilc/500').expect(500);

        chai.expect(response.text).to.be.eql('Oops! Something went wrong. Pls try to refresh page or contact support.');
    });
});
