const chai = require('chai');
const sinon = require('sinon');
const nock = require('nock');

const Registry = require('./Registry');

describe('Registry', () => {
  const wrapFetchWithCache = () => {
    return (arg) => ({
      data: [
        {
          domainName: 'this',
          template500: arg || 'exist',
        }
      ],
    })
  };

  const address = 'http://registry:8080/';
  const logger = {
    debug: sinon.stub(),
    info: sinon.spy(),
  };

  afterEach(() => {
    logger.debug.reset();
    logger.info.resetHistory();
  });

  it('getConfig should return right value', async () => {
    const registry = new Registry(address, wrapFetchWithCache, logger);
    const getConfig = await registry.getConfig();
  
    await chai.expect(getConfig).to.be.eql({
      data: [
        {
          domainName: 'this',
          template500: 'exist',
        }
      ],
    });
  })

  it('filter in getConfig should work correctly', async () => {
    const wrapFetchWithCache = () => {
      return () => ({
        data: {
          routes: [
            {
              domain: '1',
              someData: '1',
            },
            {
              domain: '2',
              someData: '2',
            }
          ],
          specialRoutes: [
            {
              domain: '1',
              specialRole: 'roleOne',
              someData: '1',
            },
            {
              domain: '2',
              specialRole: 'roleTwo',
              someData: '2',
            }
          ],
        },
      })
    };

    const registry = new Registry(address, wrapFetchWithCache, logger);
    const getConfig = await registry.getConfig({ filter: { domain: '2' } });

    await chai.expect(getConfig).to.be.eql({
      data: {
        routes: [
          {
            someData: '2',
          }
        ],
        specialRoutes: {
          'roleTwo': {
            someData: '2',
          },
        }
      },
    });
  })

  it('getTemplate should return right value if template name equal 500', async () => {
    const templateName = '500';
    const forDomain = 'this';

    const registry = new Registry(address, wrapFetchWithCache, logger);
    const getTemplate = await registry.getTemplate(templateName, forDomain);

    await chai.expect(getTemplate).to.be.eql({
      data: [
        {
          domainName: 'this',
          template500: 'exist',
        }
      ],
    })
  })

  it('getTemplate should return right value if template name not equal 500', async () => {
    const templateName = '501';
    const forDomain = 'this';

    const registry = new Registry(address, wrapFetchWithCache, logger);
    const getTemplate = await registry.getTemplate(templateName, forDomain);

    await chai.expect(getTemplate).to.be.eql({
      data: [
        {
          domainName: 'this',
          template500: '501',
        }
      ],
    })
  })

  it('Registry should preheat successfully', async () => {
    const registry = new Registry(address, wrapFetchWithCache, logger);
    await registry.preheat();

    sinon.assert.calledTwice(logger.info)
    sinon.assert.calledWithExactly(logger.info, 'Registry is preheating...');
    sinon.assert.calledWithExactly(logger.info, 'Registry preheated successfully!');
  })

  it('Registry should preheat only once', async () => {
    const wrapFetchWithCache = (callback) => callback;

    const mockConfigRequest = nock('http://registry:8080').get('/api/v1/config').reply(200, {
      content: '<ilc-slot id="body" />',
    });

    const mockTemplateRequest = nock('http://registry:8080').get('/api/v1/template/500/rendered').reply(200, {
      content: '<ilc-slot id="body" />',
    });

    const mockRouterRequest = nock('http://registry:8080').get('/api/v1/router_domains').reply(200);

    const registry = new Registry(address, wrapFetchWithCache, logger);
    await registry.preheat();
    await registry.preheat();

    sinon.assert.calledTwice(logger.info)
    sinon.assert.calledWithExactly(logger.info, 'Registry is preheating...');
    sinon.assert.calledWithExactly(logger.info, 'Registry preheated successfully!');
  })

  describe('Handling errors', async () => {
    const wrapFetchWithCache = (callback) => callback;

    it('getConfig should throw error', async () => {
      const mockConfigRequest = nock('http://registry:8080').get('/api/v1/config').reply(404);

      const registry = new Registry(address, wrapFetchWithCache, logger);

      await chai.expect(registry.getConfig()).to.eventually.rejectedWith('Error while requesting config from registry');
    });

    it('getTemplate should throw error', async () => {
      const mockTemplateRequest = nock('http://registry:8080').get('/api/v1/template/505/rendered').reply(404);

      const registry = new Registry(address, wrapFetchWithCache, logger);

      await chai.expect(registry.getTemplate('505')).to.eventually.rejectedWith('Error while requesting rendered template "505" from registry');
    });

    it('getRouterDomains should throw error', async () => {
      const mockRouterRequest = nock('http://registry:8080').get('/api/v1/router_domains').reply(404);

      const registry = new Registry(address, wrapFetchWithCache, logger);

      await chai.expect(registry.getRouterDomains()).to.eventually.rejectedWith('Error while requesting routerDomains from registry');
    });
  });
});
