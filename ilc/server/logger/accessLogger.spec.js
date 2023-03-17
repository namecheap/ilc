const AccessLogger = require('./accessLogger');
const { context } = require('../context/context');
const sinon = require('sinon');

describe('accessLogger', () => {
    it('should ignore access logs based on path', function () {
        const localConfig = { get: sinon.stub().withArgs('logger.accessLog.ignoreUrls').returns('/test/ignored/') };
        const accessLogger = new AccessLogger(localConfig);

        const logger = {
            info: sinon.stub(),
        };
        const request = {
            request: {
                raw: {
                    url: '/test/ignored/',
                    connection: {
                        encrypted: true,
                    },
                },
                hostname: 'test-machine',
                log: logger,
                id: 'test1',
            },
        };

        context.run(request, () => {
            accessLogger.logRequest();
        });

        sinon.assert.notCalled(logger.info);
    });

    it('should ignore access logs based on path when url has query string', function () {
        const localConfig = { get: sinon.stub().withArgs('logger.accessLog.ignoreUrls').returns('/test/ignored/') };
        const accessLogger = new AccessLogger(localConfig);

        const logger = {
            info: sinon.stub(),
        };
        const request = {
            request: {
                raw: {
                    url: '/test/ignored/?param=param',
                    connection: {
                        encrypted: true,
                    },
                },
                hostname: 'test-machine',
                log: logger,
                id: 'test1',
            },
        };

        context.run(request, () => {
            accessLogger.logRequest();
        });

        sinon.assert.notCalled(logger.info);
    });
});
