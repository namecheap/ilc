import sinon from 'sinon';
import { knexLoggerAdapter } from './logger';
import { getPluginManagerInstance, loadPlugins } from '../util/pluginManager';

describe('Database Logger', () => {
    let loggerMock: {
        warn: sinon.SinonStub;
        error: sinon.SinonStub;
        debug: sinon.SinonStub;
    };

    before(() => {
        loadPlugins();
    });

    beforeEach(async () => {
        // Stub the reporting plugin logger that getLogger() wraps
        const pluginLogger = getPluginManagerInstance().getReportingPlugin().logger;
        loggerMock = {
            warn: sinon.stub(pluginLogger, 'warn'),
            error: sinon.stub(pluginLogger, 'error'),
            debug: sinon.stub(pluginLogger, 'debug'),
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should log warning messages', () => {
        const adapter = knexLoggerAdapter();
        adapter.warn('test warning message');

        sinon.assert.calledOnce(loggerMock.warn);
        sinon.assert.calledWith(loggerMock.warn, { asyncContext: 'none' }, 'test warning message');
    });

    it('should log error messages', () => {
        const adapter = knexLoggerAdapter();
        adapter.error('test error message');

        sinon.assert.calledOnce(loggerMock.error);
        sinon.assert.calledWith(loggerMock.error, { asyncContext: 'none' }, 'test error message');
    });

    it('should log deprecation warnings', () => {
        const adapter = knexLoggerAdapter();
        adapter.deprecate('test deprecation message');

        sinon.assert.calledOnce(loggerMock.warn);
        sinon.assert.calledWith(loggerMock.warn, { asyncContext: 'none' }, 'test deprecation message');
    });

    it('should log debug messages', () => {
        const adapter = knexLoggerAdapter();
        adapter.debug('test debug message');

        sinon.assert.calledOnce(loggerMock.debug);
        sinon.assert.calledWith(loggerMock.debug, { asyncContext: 'none' }, 'test debug message');
    });
});
