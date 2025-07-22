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

        it('should reply with 302 and redirect to base URL ("/") for malicious @@evil.com input', async () => {
            const response = await server.get('//@@evil.com').expect(302);

            chai.expect(response.headers.location).to.be.eql('/');
        });
    });
});
