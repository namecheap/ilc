const chai = require('chai');
const sinon = require('sinon');
const supertest = require('supertest');
const nock = require('nock');
const config = require('config');
const localStorage = require('../../common/localStorage');

const createApp = require('../app');
const ErrorHandlingError = require('./ErrorHandler').ErrorHandlingError;

describe('error handler', () => {
    const errorIdRegExp = /(?<errorId>[\d\w]{8}-[\d\w]{4}-[\d\w]{4}-[\d\w]{4}-[\d\w]{12})/;

    let app;
    let server;

    before(async () => {
        app = createApp();
        await app.ready();
        server = supertest(app.server);

        sinon.spy(global.console, 'error');
    });

    afterEach(() => {
        localStorage.clear();
        global.console.error.resetHistory();
    });

    after(() => {
        app.close();
        global.console.error.restore();
    });

    it('should show 500 error page with an error id', async () => {
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
        chai.expect(JSON.parse(global.console.error.getCall(0).args[0])).to.deep.include({
            type: 'Error',
            message: '500 page test error',
            additionalInfo: {
                errorId,
            },
        });
    });

    it('should send an error message when showing 500 error page throws an error', async () => {
        const replyingError = new Error('Something awful happened.');

        nock(config.get('registry').address).get(`/api/v1/template/500/rendered`).replyWithError(replyingError.message);

        const response = await server.get('/_ilc/500').expect(500);
        const {errorId} = global.console.error.getCall(0).args[0].match(errorIdRegExp).groups;

        chai.expect(response.text).to.be.eql('Oops! Something went wrong. Pls try to refresh page or contact support.');
        chai.expect(JSON.parse(global.console.error.getCall(0).args[0])).to.deep.include({
            type: 'Error',
            message: '500 page test error',
            additionalInfo: {
                errorId,
            },
        });
        chai.expect(global.console.error.getCall(1).args[0]).to.eql(new ErrorHandlingError({
            cause: replyingError,
            d: {
                errorId,
            },
        }));
    });
});
