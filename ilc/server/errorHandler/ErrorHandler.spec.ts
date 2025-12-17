import { expect } from 'chai';
import fastify from 'fastify';
import request from 'supertest';
import nock from 'nock';
import config from 'config';
import fs from 'fs';
import path from 'path';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import sinon, { SinonStubbedInstance } from 'sinon';
import type { FastifyInstance } from 'fastify';
import type { AddressInfo } from 'net';
import type { Logger, PluginManager } from 'ilc-plugins-sdk';

import ErrorHandler, { ErrorsService, Test500Error } from './ErrorHandler';
import * as helpers from '../../tests/helpers';
import { Registry } from '../types/Registry';
import { IlcRequest } from '../types/IlcRequest';
import { IlcResponse } from '../types/FastifyReply';

const createApp = require('../app');

const defaultErrorPage = fs.readFileSync(path.resolve(__dirname, '../../server/assets/defaultErrorPage.html'), 'utf-8');

const getRegistryAddress = () => config.get<{ address: string }>('registry').address;

describe('ErrorHandler', () => {
    const errorIdRegExp = /(?<errorId>[\d\w]{8}-[\d\w]{4}-[\d\w]{4}-[\d\w]{4}-[\d\w]{12})/;

    let app: FastifyInstance;
    let server: request.Agent;
    let address: string;

    before(() => {
        if (!nock.isActive()) {
            nock.activate();
        }
    });

    beforeEach(async () => {
        app = await createApp(
            helpers.getRegistryMock() as unknown as Registry,
            helpers.getPluginManagerMock() as unknown as PluginManager,
        );
        await app.ready();
        app.server.listen(0);

        const addr = app.server.address() as AddressInfo;
        address = `127.0.0.1:${addr.port}`;

        server = request(app.server);
    });

    afterEach(() => {
        app.server.close();
    });

    it('should show 500 error page with an error id', async () => {
        nock(getRegistryAddress()).get('/api/v1/router_domains').reply(200, []);
        nock(getRegistryAddress())
            .get(`/api/v1/template/500/rendered?locale=en-US&domain=${address}`)
            .reply(200, {
                content:
                    '<html>' +
                    '<head>' +
                    '</head>' +
                    '<body>' +
                    '<main>' +
                    '<h1>Hello there!</h1>' +
                    '<div>%ERRORID%</div>' +
                    '</main>' +
                    '</body>' +
                    '</html>',
            });

        const response = await server.get('/_ilc/500').expect(500);

        const match = response.text.match(errorIdRegExp) as any;
        const { errorId } = match.groups;

        expect(response.header['cache-control']).to.be.eql('no-cache, no-store, must-revalidate');
        expect(response.header['pragma']).to.be.eql('no-cache');
        expect(response.header['content-type']).to.be.eql('text/html; charset=utf-8');
        expect(response.text).to.be.eql(
            '<html><head></head>' +
                '<body>' +
                '<main>' +
                '<h1>Hello there!</h1>' +
                `<div>Error ID: ${errorId}</div>` +
                '</main>' +
                '</body>' +
                '</html>',
        );
    });

    it('should send an error message when showing 500 error page throws an error', async () => {
        nock(getRegistryAddress()).get('/api/v1/router_domains').reply(200, []);
        const replyingError = new Error('Something awful happened.');

        nock(getRegistryAddress()).get(`/api/v1/template/500/rendered`).replyWithError(replyingError.message);

        const response = await server.get('/_ilc/500').expect(500);

        expect(response.text).equal(
            defaultErrorPage
                .replaceAll('%STATUS_CODE%', String(StatusCodes.INTERNAL_SERVER_ERROR))
                .replaceAll('%STATUS_MESSAGE%', ReasonPhrases.INTERNAL_SERVER_ERROR),
        );
        expect(response.headers['content-type']).to.be.eql('text/html; charset=utf-8');
    });

    it('should send an client error page', async () => {
        const errorService = {
            noticeError: sinon.stub(),
        } as any;

        const logger: Logger = {
            error: sinon.stub() as any,
            warn: sinon.stub() as any,
            info: sinon.stub() as any,
            debug: sinon.stub() as any,
        } as any;

        const errorHandler = new ErrorHandler({} as any, errorService as any, logger);

        const appLocal = fastify();
        const error = new Error('My Error');
        appLocal.get('/error', (req, reply) => {
            errorHandler.handleClientError(reply, error, StatusCodes.IM_A_TEAPOT);
        });
        await appLocal.ready();

        const serverLocal = request(appLocal.server);
        const { text } = await serverLocal.get(`/error`).expect(StatusCodes.IM_A_TEAPOT);
        expect(text).equal(
            defaultErrorPage
                .replaceAll('%STATUS_CODE%', String(StatusCodes.IM_A_TEAPOT))
                .replaceAll('%STATUS_MESSAGE%', ReasonPhrases.IM_A_TEAPOT),
        );
        sinon.assert.calledOnceWithExactly(logger.warn as any, error);
        sinon.assert.notCalled(logger.error as any);
        sinon.assert.notCalled(errorService.noticeError);
    });

    describe('when static error page config is specified', () => {
        const sandbox = sinon.createSandbox();
        afterEach(() => {
            sandbox.restore();
        });

        function mockConfigValue(key: string, value: unknown) {
            const oldGet = config.get.bind(config);
            sandbox.stub((config as any).constructor.prototype, 'get').callsFake(function (...args: unknown[]) {
                const name = args[0] as string;
                if (name === key) {
                    return value;
                }
                return oldGet.call(null, name);
            });
        }

        it('should send an error page from static file when showing 500 error page throws an error', async () => {
            mockConfigValue('staticError.disasterFileContentPath', './tests/fixtures/static-error.html');
            nock(getRegistryAddress()).get('/api/v1/router_domains').reply(200, []);
            const replyingError = new Error('Something awful happened.');

            nock(getRegistryAddress()).get(`/api/v1/template/500/rendered`).replyWithError(replyingError.message);

            const response = await server.get('/_ilc/500').expect(500);

            expect(response.text).to.be.eql('<html><head><title>content from file</title></head></html>\n');
        });

        it('should cache static error page content and reuse it on subsequent calls', async () => {
            mockConfigValue('staticError.disasterFileContentPath', './tests/fixtures/static-error.html');
            nock(getRegistryAddress()).get('/api/v1/router_domains').reply(200, []);
            nock(getRegistryAddress()).get(`/api/v1/template/500/rendered`).times(2).replyWithError('Error');

            // First call - reads from file
            const response1 = await server.get('/_ilc/500').expect(500);
            expect(response1.text).to.be.eql('<html><head><title>content from file</title></head></html>\n');

            // Second call - uses cached content
            const response2 = await server.get('/_ilc/500').expect(500);
            expect(response2.text).to.be.eql('<html><head><title>content from file</title></head></html>\n');
        });

        it('should log error and use default page when static file path is invalid', async () => {
            const errorService = {
                noticeError: sinon.stub(),
            };
            const logger = {
                error: sinon.stub(),
                warn: sinon.stub(),
                info: sinon.stub(),
                debug: sinon.stub(),
                fatal: sinon.stub(),
                trace: sinon.stub(),
            };
            mockConfigValue('staticError.disasterFileContentPath', '/non/existent/path/error.html');

            const errorHandler = new ErrorHandler({} as any, errorService as any, logger);

            const appLocal = fastify();
            appLocal.get('/error', (req, reply) => {
                errorHandler.handleClientError(reply, new Error('Test'), StatusCodes.INTERNAL_SERVER_ERROR);
            });
            await appLocal.ready();

            const serverLocal = request(appLocal.server);
            const { text } = await serverLocal.get(`/error`).expect(StatusCodes.INTERNAL_SERVER_ERROR);

            // Should fall back to default error page
            expect(text).equal(
                defaultErrorPage
                    .replaceAll('%STATUS_CODE%', String(StatusCodes.INTERNAL_SERVER_ERROR))
                    .replaceAll('%STATUS_MESSAGE%', ReasonPhrases.INTERNAL_SERVER_ERROR),
            );

            // Should log error about unable to read file
            sinon.assert.calledWith(
                logger.error as any,
                sinon.match.instanceOf(Error),
                'Unable to read static file content',
            );
        });
    });

    describe('when local error occurs', () => {
        it('should send prod error to error tracker and log with error level', () => {
            const errorService = {
                noticeError: sinon.stub(),
            };

            const logger = {
                error: sinon.stub(),
                warn: sinon.stub(),
                info: sinon.stub(),
                debug: sinon.stub(),
                fatal: sinon.stub(),
                trace: sinon.stub(),
            };

            const errorHandler = new ErrorHandler({} as Registry, errorService, logger);

            errorHandler.noticeError(new Error('My Error'), {});

            sinon.assert.notCalled(logger.warn);
            sinon.assert.calledOnce(logger.error);
            sinon.assert.calledOnce(errorService.noticeError);
        });

        it('should use default empty object for customAttributes when not provided', () => {
            const errorService = {
                noticeError: sinon.stub(),
            };

            const logger = {
                error: sinon.stub(),
                warn: sinon.stub(),
                info: sinon.stub(),
                debug: sinon.stub(),
                fatal: sinon.stub(),
                trace: sinon.stub(),
            };

            const errorHandler = new ErrorHandler({} as Registry, errorService, logger);

            // Call without customAttributes parameter to test default parameter
            errorHandler.noticeError(new Error('My Error'));

            sinon.assert.notCalled(logger.warn);
            sinon.assert.calledOnce(logger.error);
            sinon.assert.calledOnce(errorService.noticeError);
        });

        it('should not send local error to error tracker and log with warn level', () => {
            const errorService = {
                noticeError: sinon.stub(),
            };

            const logger = {
                error: sinon.stub(),
                warn: sinon.stub(),
                info: sinon.stub(),
                debug: sinon.stub(),
                fatal: sinon.stub(),
                trace: sinon.stub(),
            };

            const errorHandler = new ErrorHandler({} as Registry, errorService, logger);

            errorHandler.noticeError(new Error('My Error'), {}, { reportError: false });

            sinon.assert.calledOnce(logger.warn);
            sinon.assert.notCalled(logger.error);
            sinon.assert.notCalled(errorService.noticeError);
        });

        it('should log Test500Error as warn instead of error to prevent PagerDuty alerts', () => {
            const errorService = {
                noticeError: sinon.stub(),
            };

            const logger = {
                error: sinon.stub(),
                warn: sinon.stub(),
                info: sinon.stub(),
                debug: sinon.stub(),
                fatal: sinon.stub(),
                trace: sinon.stub(),
            };

            const errorHandler = new ErrorHandler({} as Registry, errorService, logger);

            errorHandler.noticeError(new Test500Error({ message: '500 page test error' }), {});

            sinon.assert.calledOnce(logger.warn);
            sinon.assert.notCalled(logger.error);
            sinon.assert.calledOnce(errorService.noticeError);
        });
    });

    describe('handleError with LDE detection', () => {
        let errorHandler: ErrorHandler;
        let mockRegistryService: SinonStubbedInstance<Registry>;
        let mockErrorsService: SinonStubbedInstance<ErrorsService>;
        let mockLogger: SinonStubbedInstance<Logger>;

        beforeEach(() => {
            mockErrorsService = {
                noticeError: sinon.stub(),
            };
            mockRegistryService = {
                getTemplate: sinon.stub().resolves({
                    data: { content: 'Error %ERRORID%', styleRefs: [] },
                    cachedAt: 0,
                }),
            } as unknown as SinonStubbedInstance<Registry>;

            mockLogger = {
                error: sinon.stub(),
                warn: sinon.stub(),
                info: sinon.stub(),
                debug: sinon.stub(),
                fatal: sinon.stub(),
                trace: sinon.stub(),
            };

            errorHandler = new ErrorHandler(mockRegistryService, mockErrorsService, mockLogger);
        });

        it('should report errors when NOT in LDE environment', async () => {
            const mockRequest = {
                headers: {},
                raw: {
                    ldeRelated: false,
                },
            };
            const mockResponse = {
                setHeader: sinon.stub(),
                write: sinon.stub(),
                end: sinon.stub(),
            };
            const error = new Error('test error');

            await errorHandler.handleError(
                error,
                mockRequest as unknown as IlcRequest,
                mockResponse as unknown as IlcResponse,
            );

            sinon.assert.calledOnceWithExactly(mockErrorsService.noticeError, error, { errorId: sinon.match.string });
            sinon.assert.calledOnceWithExactly(mockLogger.error, error);
        });

        it('should NOT report errors when in LDE environment', async () => {
            const mockRequest = {
                headers: {},
                raw: {
                    ldeRelated: true,
                },
            };
            const mockResponse = {
                setHeader: sinon.stub(),
                write: sinon.stub(),
                end: sinon.stub(),
            };
            const error = new Error('test error');

            await errorHandler.handleError(
                error,
                mockRequest as unknown as IlcRequest,
                mockResponse as unknown as IlcResponse,
            );

            sinon.assert.notCalled(mockErrorsService.noticeError);
        });

        it('should handle non-Fastify request with LDE detection', async () => {
            const mockRequest = {
                headers: { host: 'example.com' },
                ldeRelated: true,
                ilcState: { locale: 'en-US' },
            };
            const mockResponse = {
                setHeader: sinon.stub(),
                write: sinon.stub(),
                end: sinon.stub(),
            };
            const error = new Error('test error');

            await errorHandler.handleError(
                error,
                mockRequest as unknown as IlcRequest,
                mockResponse as unknown as IlcResponse,
            );

            sinon.assert.notCalled(mockErrorsService.noticeError);
        });

        it('should handle non-Fastify request without LDE', async () => {
            const mockRequest = {
                headers: { host: 'test.example.com' },
                ldeRelated: false,
                ilcState: { locale: 'fr-FR' },
            };
            const mockResponse = {
                setHeader: sinon.stub(),
                write: sinon.stub(),
                end: sinon.stub(),
            };
            const error = new Error('test error');

            await errorHandler.handleError(
                error,
                mockRequest as unknown as IlcRequest,
                mockResponse as unknown as IlcResponse,
            );

            sinon.assert.calledOnceWithExactly(mockErrorsService.noticeError, error, { errorId: sinon.match.string });
            sinon.assert.calledOnceWithExactly(mockLogger.error, error);
        });

        it('should handle non-Fastify request with missing ilcState', async () => {
            const mockRequest = {
                headers: { host: 'another.example.com' },
                ldeRelated: false,
            };
            const mockResponse = {
                setHeader: sinon.stub(),
                write: sinon.stub(),
                end: sinon.stub(),
            };
            const error = new Error('test error');

            await errorHandler.handleError(
                error,
                mockRequest as unknown as IlcRequest,
                mockResponse as unknown as IlcResponse,
            );

            sinon.assert.calledOnceWithExactly(mockErrorsService.noticeError, error, { errorId: sinon.match.string });
            sinon.assert.calledOnceWithExactly(mockLogger.error, error);
        });
    });
});
