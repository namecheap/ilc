const chai = require('chai');
const supertest = require('supertest');
const helpers = require('../tests/helpers');
const { context } = require('./context/context');
const createApp = require('./app');

async function createTestServer(mockRegistryOptions = {}, mockPluginOptions = {}) {
    const app = createApp(
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
        const serverInstance = await createTestServer();
        app = serverInstance.app;
        server = serverInstance.server;
    });

    after(() => {
        app.server.close();
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
});
