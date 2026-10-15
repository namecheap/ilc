import axios from 'axios';
import { expect } from 'chai';
import config from 'config';
import nock from 'nock';
import sinon from 'sinon';
import reportPlugin from '../plugins/reportingPlugin';
import Registry from './Registry';
import { registryFactory } from './factory';

const registryConfig = {
    apps: {},
    routes: [],
    specialRoutes: [],
    settings: {},
    sharedLibs: {},
    dynamicLibs: {},
};

describe('registryFactory', () => {
    const registryAddress: string = config.get('registry.address');

    let logger: { debug: sinon.SinonStub; info: sinon.SinonStub; warn: sinon.SinonStub; error: sinon.SinonStub };

    beforeEach(() => {
        logger = { debug: sinon.stub(), info: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };
        sinon.stub(reportPlugin, 'getLogger').returns(logger);
    });

    afterEach(() => {
        sinon.restore();
        nock.cleanAll();
    });

    it('creates a Registry that fetches config from the configured registry address', async () => {
        const scope = nock(registryAddress).get('/api/v1/config').reply(200, registryConfig);

        const registry = registryFactory();

        expect(registry).to.be.instanceOf(Registry);
        expect(await registry.getConfig()).to.deep.equal(registryConfig);
        expect(scope.isDone()).to.be.true;
    });

    it('logs a warning when the registry cache evicts an entry after exceeding 1000 keys', async () => {
        const requestsCount = 1001;
        sinon.stub(axios, 'get').resolves({ data: registryConfig });

        const registry = registryFactory();

        // Every domain filter produces a distinct cache key, so the 1001st entry evicts the oldest one
        await Promise.all(
            Array.from({ length: requestsCount }, (_, index) =>
                registry.getConfig({ filter: { domain: `domain-${index}.example.com` } }),
            ),
        );

        sinon.assert.calledOnceWithExactly(
            logger.warn,
            { key: sinon.match.string },
            sinon.match('ILC registry cache eviction: maxSize (1000) exceeded.'),
        );
    });

    it('does not log an eviction warning while the cache stays within 1000 keys', async () => {
        const requestsCount = 1000;
        sinon.stub(axios, 'get').resolves({ data: registryConfig });

        const registry = registryFactory();

        await Promise.all(
            Array.from({ length: requestsCount }, (_, index) =>
                registry.getConfig({ filter: { domain: `domain-${index}.example.com` } }),
            ),
        );

        sinon.assert.notCalled(logger.warn);
    });
});
