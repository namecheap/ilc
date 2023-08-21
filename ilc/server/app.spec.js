const chai = require('chai');
const supertest = require('supertest');
const nock = require('nock');
const config = require('config');
const helpers = require('../tests/helpers');
const { context } = require('./context/context');

const createApp = require('./app');
const sinon = require('sinon');

describe('App', () => {
    let app;
    let server;
    let address;

    before(async () => {
        app = createApp(helpers.getRegistryMock(), helpers.getPluginManagerMock(), context);
        await app.ready();
        app.server.listen(0);

        const { port } = app.server.address();
        address = `127.0.0.1:${port}`;

        server = supertest(app.server);
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
});
