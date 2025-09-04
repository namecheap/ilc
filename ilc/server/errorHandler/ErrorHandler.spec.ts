import { expect } from 'chai';
import fastify from 'fastify';
import request from 'supertest';
import nock from 'nock';
import config from 'config';
import fs from 'fs';
import path from 'path';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import sinon from 'sinon';
import type { FastifyInstance } from 'fastify';
import type { AddressInfo } from 'net';
import type { Logger, PluginManager } from 'ilc-plugins-sdk';

import { context } from '../context/context';
import ErrorHandler from './ErrorHandler';
import helpers = require('../../tests/helpers');
import { Registry } from '../types/Registry';

const createApp = require('../app');

const defaultErrorPage = fs.readFileSync(path.resolve(__dirname, '../../server/assets/defaultErrorPage.html'), 'utf-8');

const getRegistryAddress = () => config.get<{ address: string }>('registry').address;

describe('ErrorHandler', () => {
    const errorIdRegExp = /(?<errorId>[\d\w]{8}-[\d\w]{4}-[\d\w]{4}-[\d\w]{4}-[\d\w]{12})/;

    let app: FastifyInstance;
    let server: request.Agent;
    let address: string;

    beforeEach(async () => {
        app = createApp(
            helpers.getRegistryMock() as unknown as Registry,
            helpers.getPluginManagerMock() as unknown as PluginManager,
            context,
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
    });

    describe('when local error occurs', () => {
        it('should send prod error to error tracker and log with error level', () => {
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

            errorHandler.noticeError(new Error('My Error'), {});

            sinon.assert.notCalled(logger.warn as any);
            sinon.assert.calledOnce(logger.error as any);
            sinon.assert.calledOnce(errorService.noticeError);
        });

        it('should not send local error to error tracker and log with warn level', () => {
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

            errorHandler.noticeError(new Error('My Error'), {}, { reportError: false });

            sinon.assert.calledOnce(logger.warn as any);
            sinon.assert.notCalled(logger.error as any);
            sinon.assert.notCalled(errorService.noticeError);
        });
    });
});
