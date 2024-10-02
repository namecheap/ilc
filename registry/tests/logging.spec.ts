import sinon, { SinonSpy } from 'sinon';
import supertest from 'supertest';

import createApplication from '../server/app';
import { getLogger } from '../server/util/logger';
import { getPluginManagerInstance, loadPlugins } from '../server/util/pluginManager';

import type { Handler } from 'express';
import { extendError } from '../server/util/extendError';

async function runScenario(handler: Handler) {
    const app = await createApplication(true);
    app.get('/test', handler);
    const request = supertest.agent(app);

    await request
        .post('/auth/local')
        .set('Content-Type', 'application/json')
        .send({
            username: 'root',
            password: 'pwd',
        })
        .expect(200);
    await request.get('/test').expect(200);
}

describe('Logging', () => {
    let errorLog: SinonSpy;
    before(async () => {
        loadPlugins();
        errorLog = sinon.spy(getPluginManagerInstance().getReportingPlugin().logger, 'error');
    });
    beforeEach(() => {
        errorLog.resetHistory();
    });
    after(() => {
        errorLog.restore();
    });

    it('should log string in json format', async () => {
        const logStringHandler: Handler = (req, res, next) => {
            getLogger().error('test');
            res.end();
        };
        await runScenario(logStringHandler);
        sinon.assert.calledWith(errorLog, sinon.match({ userId: 'root', operationId: sinon.match.string }), 'test');
    });

    it('should log info with path and clientIp', async () => {
        const logStringHandler: Handler = (req, res, next) => {
            getLogger().error('test');
            res.end();
        };
        await runScenario(logStringHandler);
        sinon.assert.calledWith(
            errorLog,
            sinon.match({ userId: 'root', path: '/test', clientIp: '::ffff:127.0.0.1' }),
            'test',
        );
    });

    it('should log object json format', async () => {
        const logObjectHandler: Handler = (req, res, next) => {
            getLogger().error({ key: 'value' });
            res.end();
        };
        await runScenario(logObjectHandler);
        sinon.assert.calledWith(
            errorLog,
            sinon.match({ userId: 'root', operationId: sinon.match.string, key: 'value' }),
        );
    });

    it('should log error json format', async () => {
        const logObjectHandler: Handler = (req, res, next) => {
            getLogger().error(new Error('desc'));
            res.end();
        };
        await runScenario(logObjectHandler);
        sinon.assert.calledWith(
            errorLog,
            sinon.match({
                message: 'desc',
                stack: sinon.match.string,
                data: {
                    userId: 'root',
                    operationId: sinon.match.string,
                    path: '/test',
                    clientIp: sinon.match.string,
                    domain: '127.0.0.1',
                },
            }),
        );
    });

    it('should log extended error json format', async () => {
        const logObjectHandler: Handler = (req, res, next) => {
            const CustomError = extendError('Custom');
            try {
                getLogger().error(new CustomError({ message: 'desc', data: { a: 1 }, cause: new Error('cause') }));
            } catch (e) {
                console.log(e);
            }
            res.end();
        };
        await runScenario(logObjectHandler);
        sinon.assert.calledWith(
            errorLog,
            sinon.match({
                message: 'desc',
                stack: sinon.match.string,
                cause: sinon.match({
                    message: 'cause',
                    stack: sinon.match.string,
                }),
                data: {
                    userId: 'root',
                    operationId: sinon.match.string,
                    path: '/test',
                    clientIp: sinon.match.string,
                    domain: '127.0.0.1',
                    a: 1,
                },
            }),
        );
    });
});
