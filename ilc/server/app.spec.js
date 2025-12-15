const chai = require('chai');
const nock = require('nock');
const supertest = require('supertest');
const helpers = require('../tests/helpers');
const { context } = require('./context/context');
const createApp = require('./app');

async function createTestServer(mockRegistryOptions = {}, mockPluginOptions = {}) {
    const app = await createApp(
        helpers.getRegistryMock(mockRegistryOptions),
        helpers.getPluginManagerMock(mockPluginOptions),
        context,
    );

    await app.ready();
    app.server.listen(0);

    const { port } = app.server.address();
    const address = `127.0.0.1:${port}`;
    const server = supertest(app.server);

    return { app, server, address };
}

describe('App', () => {
    let app;
    let server;

    before(async () => {
        helpers.setupMockServersForApps();
        const serverInstance = await createTestServer();
        app = serverInstance.app;
        server = serverInstance.server;
    });

    after(() => {
        app.server.close();
        nock.cleanAll();
    });

    it('should return 405 for allowed requests', async () => {
        const responsePost = await server.post('/').expect(405);
        chai.expect(responsePost.text).to.be.eql('{"message":"Method Not Allowed"}');

        const responsePut = await server.put('/').expect(405);
        chai.expect(responsePut.text).to.be.eql('{"message":"Method Not Allowed"}');

        await server.get('/').expect(200);
        await server.options('/').expect(200);
        await server.head('/').expect(200);
    });

    it('should return 400 for data URI requests', async () => {
        const responseSvg = await server
            .get('/data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4=')
            .expect(400);
        chai.expect(responseSvg.body.message).to.include('Bad Request');
        chai.expect(responseSvg.body.message).to.include('Data URIs');

        const responsePng = await server
            .get(
                '/data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            )
            .expect(400);
        chai.expect(responsePng.body.message).to.include('Bad Request');
        chai.expect(responsePng.body.message).to.include('Data URIs');

        const responseText = await server.get('/data:text/html,<h1>Test</h1>').expect(400);
        chai.expect(responseText.body.message).to.include('Bad Request');
        chai.expect(responseText.body.message).to.include('Data URIs');
    });

    it('should return 400 for data URI bypass attempts (security)', async () => {
        nock.restore();
        const responseUpperCase = await server.get('/DATA:image/png;base64,xxx').expect(400);
        chai.expect(responseUpperCase.body.message).to.include('Data URIs');

        const responseMixedCase = await server.get('/DaTa:text/html,test').expect(400);
        chai.expect(responseMixedCase.body.message).to.include('Data URIs');

        const responseEncoded1 = await server.get('/data%3Aimage/png;base64,xxx').expect(400);
        chai.expect(responseEncoded1.body.message).to.include('Data URIs');

        const responseEncoded2 = await server.get('/%64ata:image/png;base64,xxx').expect(400);
        chai.expect(responseEncoded2.body.message).to.include('Data URIs');

        const responseDoubleSlash = await server.get('//data:image/png;base64,xxx').expect(400);
        chai.expect(responseDoubleSlash.body.message).to.include('Data URIs');

        const responseTripleSlash = await server.get('///data:text/html,test').expect(400);
        chai.expect(responseTripleSlash.body.message).to.include('Data URIs');

        const responseCombined1 = await server.get('//DATA:image/png;base64,xxx').expect(400);
        chai.expect(responseCombined1.body.message).to.include('Data URIs');

        const responseCombined2 = await server.get('//data%3Aimage/png').expect(400);
        chai.expect(responseCombined2.body.message).to.include('Data URIs');
    });

    it('should parse "invalid" urls', async () => {
        await server.get('///').expect(200);
    });

    it('should respond to health check ping endpoint', async () => {
        const response = await server.get('/ping').expect(200);
        chai.expect(response.text).to.be.eql('pong');
    });

    it('should call registry preheat when ping endpoint is hit', async () => {
        const sinon = require('sinon');
        const preheatStub = sinon.stub().resolves();

        const { app: testApp, server: testServer } = await createTestServer({
            preheat: preheatStub,
        });

        try {
            await testServer.get('/ping').expect(200);
            sinon.assert.calledOnce(preheatStub);
        } finally {
            testApp.server.close();
        }
    });

    describe('Static assets', () => {
        it('should serve client.js from /_ilc/ path', async () => {
            const response = await server.get('/_ilc/client.js').expect(200);

            chai.expect(response.headers['content-type']).to.match(/text\/javascript; charset=utf-8/);
            chai.expect(response.headers).to.have.property('cache-control');
            chai.expect(response.text).to.be.a('string');
            chai.expect(response.text.length).to.be.greaterThan(0);
        });
    });

    describe('Template rendering endpoint', () => {
        it('should render template successfully', async () => {
            const response = await server.get('/_ilc/api/v1/registry/template/master').expect(200);

            chai.expect(response.text).to.be.a('string');
            chai.expect(response.text).to.include('<!DOCTYPE html>');
            chai.expect(response.text).to.include('<slot');
        });

        it('should return 404 when template not found', async () => {
            const { app: testApp, server: testServer } = await createTestServer({
                getTemplate: () => {
                    const { NotFoundRegistryError } = require('./registry/errors');
                    throw new NotFoundRegistryError({ message: 'Template not found' });
                },
            });

            try {
                await testServer.get('/_ilc/api/v1/registry/template/nonexistent').expect(404);
            } finally {
                testApp.server.close();
            }
        });

        it('should return 400 when template has validation error', async () => {
            const { app: testApp, server: testServer } = await createTestServer({
                getTemplate: () => {
                    const { ValidationRegistryError } = require('./registry/errors');
                    throw new ValidationRegistryError({ message: 'Invalid template name' });
                },
            });

            try {
                await testServer.get('/_ilc/api/v1/registry/template/invalid').expect(400);
            } finally {
                testApp.server.close();
            }
        });

        it('should handle other errors by throwing them', async () => {
            const { app: testApp, server: testServer } = await createTestServer({
                getTemplate: () => {
                    throw new Error('Unexpected error');
                },
            });

            try {
                // The error should be caught by the error handler and return 500
                await testServer.get('/_ilc/api/v1/registry/template/error').expect(500);
            } finally {
                testApp.server.close();
            }
        });
    });

    describe('Redirect with trailing slash', () => {
        let app;
        let server;

        beforeEach(async () => {
            const serverInstance = await createTestServer({
                settings: {
                    trailingSlash: 'redirectToTrailingSlash',
                },
            });

            app = serverInstance.app;
            server = serverInstance.server;
        });

        afterEach(() => {
            if (app && app.server && app.server.listening) {
                app.server.close();
            }
        });

        it('should reply with 301 in case of redirect /someRoute -> /someRoute/', async () => {
            const response = await server.get('/someRoute').expect(301);

            chai.expect(response.headers.location).to.be.eql('/someRoute/');
        });

        it('should reply with 302 in case of open redirect attempt but lead to correct route', async () => {
            const response = await server.get('//google.com//').expect(302);

            chai.expect(response.headers.location).to.be.eql('/google.com/');
        });

        it('should reply with 302 in case of open redirect attempt but lead to correct route for complex route', async () => {
            const response = await server.get('//google.com//someRoute//').expect(302);

            chai.expect(response.headers.location).to.be.eql('/google.com/someRoute/');
        });
    });

    it('should filter fragment response headers to only preserve set-cookie', async () => {
        nock.activate();
        const response = await server.get('/primary').expect(200);
        // The set-cookie header from primary fragment should be in response
        chai.expect(response.headers['set-cookie']).to.exist;
        chai.expect(response.headers['set-cookie']).to.include('asd=asd');
        chai.expect(response.headers['set-cookie'].join(';')).to.match(/ilc-i18n=/);

        // Custom headers from fragment should NOT leak through (filtered by filterResponseHeaders)
        chai.expect(response.headers['x-custom-header']).to.be.undefined;
    });
});
