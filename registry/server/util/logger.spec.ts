import { expect } from 'chai';
import sinon, { type SinonStub } from 'sinon';
import { storage, type Store } from '../middleware/context';
import { getLogger, setErrorData } from './logger';
import { getPluginManagerInstance, loadPlugins } from './pluginManager';
import { TypedMap } from './TypedMap';

function runInRequest(callback: () => void) {
    const store = new TypedMap<Store>();
    store.set('reqId', 'req-1');
    store.set('domain', 'example.com');
    store.set('path', '/test');
    store.set('clientIp', '10.0.0.1');
    store.set('user', { authEntityId: 1, identifier: 'root', role: 'admin' });
    storage.run(store, callback);
}

const requestContext = {
    operationId: 'req-1',
    domain: 'example.com',
    userId: 'root',
    path: '/test',
    clientIp: '10.0.0.1',
};

describe('getLogger', () => {
    let info: SinonStub;
    let error: SinonStub;

    before(() => {
        loadPlugins();
    });

    beforeEach(() => {
        const pluginLogger = getPluginManagerInstance().getReportingPlugin().logger;
        info = sinon.stub(pluginLogger, 'info');
        error = sinon.stub(pluginLogger, 'error');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should mark logs outside of a request', () => {
        getLogger().info('message');

        sinon.assert.calledOnceWithExactly(info, { asyncContext: 'none' }, 'message');
    });

    it('should pass extra arguments after a string message', () => {
        runInRequest(() => getLogger().info('message %s', 'value'));

        sinon.assert.calledOnceWithExactly(info, requestContext, 'message %s', 'value');
    });

    it('should merge an object with the request context and pass the message', () => {
        runInRequest(() => getLogger().info({ key: 'value' }, 'message'));

        sinon.assert.calledOnceWithExactly(info, { ...requestContext, key: 'value' }, 'message');
    });

    it('should let object keys override the request context', () => {
        runInRequest(() => getLogger().info({ path: '/custom' }));

        sinon.assert.calledOnceWithExactly(info, { ...requestContext, path: '/custom' });
    });

    it('should attach the request context to an error and pass the message', () => {
        const err = new Error('boom');

        runInRequest(() => getLogger().error(err, 'message'));

        sinon.assert.calledOnceWithExactly(error, err, 'message');
        expect(Reflect.get(err, 'data')).to.deep.equal(requestContext);
    });

    it('should use the request id label of the reporting plugin', () => {
        const plugin = getPluginManagerInstance().getReportingPlugin();
        sinon.stub(plugin, 'requestIdLogLabel').value('requestId');

        runInRequest(() => getLogger().info('message'));

        const { operationId, ...rest } = requestContext;
        sinon.assert.calledOnceWithExactly(info, { ...rest, requestId: operationId }, 'message');
    });

    it('should return properties that are not functions as they are', () => {
        const pluginLogger = getPluginManagerInstance().getReportingPlugin().logger;
        Reflect.set(pluginLogger, 'level', 'debug');
        try {
            expect(Reflect.get(getLogger(), 'level')).to.equal('debug');
        } finally {
            Reflect.deleteProperty(pluginLogger, 'level');
        }
    });
});

describe('setErrorData', () => {
    it('should add data to an error without data', () => {
        const err = new Error('boom');

        setErrorData(err, { a: 1 });

        expect(Reflect.get(err, 'data')).to.deep.equal({ a: 1 });
        expect(Object.keys(err)).to.include('data');
    });

    it('should merge into existing data', () => {
        const err = Object.assign(new Error('boom'), { data: { a: 1 } });

        setErrorData(err, { b: 2 });

        expect(err.data).to.deep.equal({ a: 1, b: 2 });
    });

    it('should replace data that is not an object', () => {
        const err = Object.assign(new Error('boom'), { data: 'text' });

        setErrorData(err, { a: 1 });

        expect(err.data).to.deep.equal({ a: 1 });
    });
});
