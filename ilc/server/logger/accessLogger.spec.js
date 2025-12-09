const AccessLogger = require('./accessLogger');
const { context } = require('../context/context');
const sinon = require('sinon');

describe('accessLogger', () => {
    const logger = {
        info: sinon.stub(),
    };
    beforeEach(() => {
        logger.info.resetHistory();
    });

    it('log request', function () {
        const localConfig = { get: sinon.stub().withArgs('logger.accessLog.ignoreUrls').returns('/test/ignored/') };

        const accessLogger = new AccessLogger(localConfig, logger);
        const request = {
            request: {
                raw: {
                    url: '/test/1',
                    connection: {
                        encrypted: true,
                    },
                },
            },
        };

        context.run(request, () => {
            accessLogger.logRequest({ additional: true });
        });

        sinon.assert.calledOnceWithExactly(logger.info, { additional: true }, sinon.match.string);
    });

    it('log response', function () {
        const localConfig = { get: sinon.stub().withArgs('logger.accessLog.ignoreUrls').returns('/test/ignored/') };

        const accessLogger = new AccessLogger(localConfig, logger);
        const request = {
            request: {
                raw: {
                    url: '/test/1',
                    connection: {
                        encrypted: true,
                    },
                },
            },
        };

        context.run(request, () => {
            accessLogger.logResponse({ additional: true });
        });

        sinon.assert.calledOnceWithExactly(logger.info, { additional: true }, sinon.match.string);
    });

    it('should ignore access logs based on path', function () {
        const localConfig = { get: sinon.stub().withArgs('logger.accessLog.ignoreUrls').returns('/test/ignored/') };
        const accessLogger = new AccessLogger(localConfig, logger);
        const request = {
            request: {
                raw: {
                    url: '/test/ignored/',
                    connection: {
                        encrypted: true,
                    },
                },
                hostname: 'test-machine',
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
        const logger = {
            info: sinon.stub(),
        };
        const accessLogger = new AccessLogger(localConfig, logger);

        const request = {
            request: {
                raw: {
                    url: '/test/ignored/?param=param',
                    connection: {
                        encrypted: true,
                    },
                },
                hostname: 'test-machine',
                id: 'test1',
            },
        };

        context.run(request, () => {
            accessLogger.logRequest();
        });

        sinon.assert.notCalled(logger.info);
    });

    describe('error handling', () => {
        it('should throw error when logData is not an object (string)', function () {
            const localConfig = { get: sinon.stub().withArgs('logger.accessLog.ignoreUrls').returns('/test/ignored/') };
            const accessLogger = new AccessLogger(localConfig, logger);

            const request = {
                request: {
                    raw: {
                        url: '/test/1',
                        connection: {
                            encrypted: true,
                        },
                    },
                },
            };

            context.run(request, () => {
                try {
                    accessLogger.logRequest('invalid string');
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    sinon.assert.match(error.message, /Invalid format of the passed log data for logging/);
                }
            });
        });

        it('should throw error when logData is null', function () {
            const localConfig = { get: sinon.stub().withArgs('logger.accessLog.ignoreUrls').returns('/test/ignored/') };
            const accessLogger = new AccessLogger(localConfig, logger);

            const request = {
                request: {
                    raw: {
                        url: '/test/1',
                        connection: {
                            encrypted: true,
                        },
                    },
                },
            };

            context.run(request, () => {
                try {
                    accessLogger.logResponse(null);
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    sinon.assert.match(error.message, /Invalid format of the passed log data for logging/);
                }
            });
        });

        it('should throw error when logData is a number', function () {
            const localConfig = { get: sinon.stub().withArgs('logger.accessLog.ignoreUrls').returns('/test/ignored/') };
            const accessLogger = new AccessLogger(localConfig, logger);

            const request = {
                request: {
                    raw: {
                        url: '/test/1',
                        connection: {
                            encrypted: true,
                        },
                    },
                },
            };

            context.run(request, () => {
                try {
                    accessLogger.logRequest(123);
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    sinon.assert.match(error.message, /Invalid format of the passed log data for logging/);
                }
            });
        });

        it('should throw error when logger is not available', function () {
            const localConfig = { get: sinon.stub().withArgs('logger.accessLog.ignoreUrls').returns('/test/ignored/') };
            const accessLogger = new AccessLogger(localConfig, null);

            const request = {
                request: {
                    raw: {
                        url: '/test/1',
                        connection: {
                            encrypted: true,
                        },
                    },
                },
            };

            context.run(request, () => {
                try {
                    accessLogger.logRequest({ data: 'test' });
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    sinon.assert.match(error.message, /Logger is not available/);
                }
            });
        });
    });

    describe('default parameters', () => {
        it('should use default empty object when logResponse is called without arguments', function () {
            const localConfig = { get: sinon.stub().withArgs('logger.accessLog.ignoreUrls').returns('/test/ignored/') };
            const accessLogger = new AccessLogger(localConfig, logger);

            const request = {
                request: {
                    raw: {
                        url: '/test/1',
                        connection: {
                            encrypted: true,
                        },
                    },
                },
            };

            context.run(request, () => {
                accessLogger.logResponse();
            });

            sinon.assert.calledOnceWithExactly(logger.info, {}, 'request completed');
        });

        it('should use default empty object when logRequest is called without arguments', function () {
            const localConfig = { get: sinon.stub().withArgs('logger.accessLog.ignoreUrls').returns('/test/ignored/') };
            const accessLogger = new AccessLogger(localConfig, logger);

            const request = {
                request: {
                    raw: {
                        url: '/test/1',
                        connection: {
                            encrypted: true,
                        },
                    },
                },
            };

            context.run(request, () => {
                accessLogger.logRequest();
            });

            sinon.assert.calledOnceWithExactly(logger.info, {}, 'received request');
        });
    });
});
