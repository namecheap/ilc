const chai = require('chai');
const sinon = require('sinon');
const config = require('config');
const runServer = require('./server');

describe('server', () => {
    let app;
    let configGet;

    beforeEach(() => {
        // runServer subscribes exit handlers that would close the app and exit the test process
        sinon.stub(process, 'on');
        configGet = sinon.stub(config, 'get').callThrough();
        app = { server: {}, listen: sinon.stub(), close: sinon.stub(), log: { error: sinon.stub() } };
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should keep idle connections open for the shipped default of 300 milliseconds', () => {
        runServer(app);

        chai.expect(app.server.keepAliveTimeout).to.equal(300);
    });

    it('should keep idle connections open for the configured number of milliseconds', () => {
        configGet.withArgs('keepAliveTimeoutMs').returns(65000);

        runServer(app);

        chai.expect(app.server.keepAliveTimeout).to.equal(65000);
    });

    it('should accept the number of milliseconds as a string from the ILC_KEEP_ALIVE_TIMEOUT_MS env variable', () => {
        configGet.withArgs('keepAliveTimeoutMs').returns('65000');

        runServer(app);

        chai.expect(app.server.keepAliveTimeout).to.equal(65000);
    });

    it('should allow disabling the keep-alive timeout with 0', () => {
        configGet.withArgs('keepAliveTimeoutMs').returns(0);

        runServer(app);

        chai.expect(app.server.keepAliveTimeout).to.equal(0);
    });

    for (const invalid of [-1, 1.5, '', ' ', 'abc', '-1', '1.5', null, true]) {
        it(`should refuse to start with keepAliveTimeoutMs ${JSON.stringify(invalid)}`, () => {
            configGet.withArgs('keepAliveTimeoutMs').returns(invalid);

            chai.expect(() => runServer(app)).to.throw(TypeError, 'keepAliveTimeoutMs');
            chai.expect(app.listen.called).to.equal(false);
        });
    }

    it('should listen on the configured port after applying the keep-alive timeout', () => {
        runServer(app);

        chai.expect(app.listen.calledOnceWith(sinon.match({ port: config.get('port'), host: '0.0.0.0' }))).to.equal(
            true,
        );
    });
});
