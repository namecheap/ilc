import sinon from 'sinon';
import { knexLoggerAdapter } from '../server/db/logger';

describe('Database Logger', () => {
    let loggerMock: {
        warn: sinon.SinonStub;
        error: sinon.SinonStub;
        debug: sinon.SinonStub;
        fatal: sinon.SinonStub;
        info: sinon.SinonStub;
        trace: sinon.SinonStub;
    };

    beforeEach(async () => {
        // Create mock logger
        loggerMock = {
            warn: sinon.stub(),
            error: sinon.stub(),
            debug: sinon.stub(),
            fatal: sinon.stub(),
            info: sinon.stub(),
            trace: sinon.stub(),
        };

        // Stub the module's getLogger function
        const loggerModule = await import('../server/util/logger');
        sinon.stub(loggerModule, 'getLogger').returns(loggerMock);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should log warning messages', () => {
        const adapter = knexLoggerAdapter();
        adapter.warn('test warning message');

        sinon.assert.calledOnce(loggerMock.warn);
        sinon.assert.calledWith(loggerMock.warn, 'test warning message');
    });

    it('should ignore specific warning messages', () => {
        const adapter = knexLoggerAdapter();
        adapter.warn('.returning() is not supported by mysql and will not have any effect.');

        sinon.assert.notCalled(loggerMock.warn);
    });

    it('should log error messages', () => {
        const adapter = knexLoggerAdapter();
        adapter.error('test error message');

        sinon.assert.calledOnce(loggerMock.error);
        sinon.assert.calledWith(loggerMock.error, 'test error message');
    });

    it('should log deprecation warnings', () => {
        const adapter = knexLoggerAdapter();
        adapter.deprecate('test deprecation message');

        sinon.assert.calledOnce(loggerMock.warn);
        sinon.assert.calledWith(loggerMock.warn, 'test deprecation message');
    });

    it('should log debug messages', () => {
        const adapter = knexLoggerAdapter();
        adapter.debug('test debug message');

        sinon.assert.calledOnce(loggerMock.debug);
        sinon.assert.calledWith(loggerMock.debug, 'test debug message');
    });
});
