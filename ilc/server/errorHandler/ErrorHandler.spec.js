const chai = require('chai');
const supertest = require('supertest');
const nock = require('nock');
const stdoutInterceptor = require("test-console").stdout;
const config = require('config');
const localStorage = require('../../common/localStorage');

const createApp = require('../app');

const parseOutput = capturedOutput => capturedOutput.map(v => {
    v = Buffer.from(v).toString('utf-8');
    try {
        return JSON.parse(v);
    } catch (e) {
        return v;
    }

});

describe('error handler', () => {
    const errorIdRegExp = /(?<errorId>[\d\w]{8}-[\d\w]{4}-[\d\w]{4}-[\d\w]{4}-[\d\w]{12})/;

    let app;
    let server;
    let stdoutInspect;

    before(async () => {
        app = createApp();
        await app.ready();
        server = supertest(app.server);
    });

    beforeEach(() => {
        stdoutInspect = stdoutInterceptor.inspect();
    });

    afterEach(() => {
        localStorage.clear();
        stdoutInspect.restore();
    });

    after(() => {
        app.close();
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

        const output = parseOutput(stdoutInspect.output);

        chai.expect(output[1]).to.deep.include({
            level: 50,
            type: 'Error',
            message: '500 page test error',
            additionalInfo: {
                errorId,
                reqId: output[1].additionalInfo.reqId || 'some value should be here',
            },
        });

        chai.expect(output[1].stack[0]).to.eql('Error: 500 page test error');
        chai.expect(output[1]).to.have.property('time');
        chai.expect(output[1]).to.have.property('pid');
        chai.expect(output[1]).to.have.property('hostname');
    });

    it('should send an error message when showing 500 error page throws an error', async () => {
        const replyingError = new Error('Something awful happened.');

        nock(config.get('registry').address).get(`/api/v1/template/500/rendered`).replyWithError(replyingError.message);

        const response = await server.get('/_ilc/500').expect(500);
        const output = parseOutput(stdoutInspect.output);

        chai.expect(response.text).to.be.eql('Oops! Something went wrong. Pls try to refresh page or contact support.');
        chai.expect(output[1]).to.deep.include({
            level: 50,
            type: 'Error',
            message: '500 page test error',
        });
        chai.expect(output[1]).to.have.nested.property('additionalInfo.errorId');
        chai.expect(output[2].stack.join("\n")).to.have.string("ErrorHandlingError: \n");
        chai.expect(output[2].stack.join("\n")).to.have.string("Caused by: Error: Something awful happened.\n");
        chai.expect(output[2]).to.have.property('time');
        chai.expect(output[2]).to.have.property('pid');
        chai.expect(output[2]).to.have.property('hostname');
    });
});
