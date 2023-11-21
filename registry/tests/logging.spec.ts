import sinon, { SinonSpy } from 'sinon';
import supertest from 'supertest';

import errorExtender from '@namecheap/error-extender';

import createApplication from '../server/app';
import { getLogger } from '../server/util/logger';
import { getPluginManagerInstance, loadPlugins } from '../server/util/pluginManager';

import type { Handler } from 'express';

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
            sinon.match({ message: 'desc', data: sinon.match({ userId: 'root', operationId: sinon.match.string }) }),
        );
    });

    it('should log extended error json format', async () => {
        const logObjectHandler: Handler = (req, res, next) => {
            const CustomError = errorExtender('Custom');
            try {
                getLogger().error(new CustomError({ message: 'desc' }));
            } catch (e) {
                console.log(e);
            }
            res.end();
        };
        await runScenario(logObjectHandler);
        sinon.assert.calledWith(
            errorLog,
            sinon.match({ message: 'desc', data: sinon.match({ userId: 'root', operationId: sinon.match.string }) }),
        );
    });
});
